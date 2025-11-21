from flask import Flask, request, jsonify, send_file, render_template, make_response
import json
import sqlite3
import uuid
import os
from chess import ChessSolver

app = Flask(__name__)

def init_db(): # 初始化数据库
    conn = sqlite3.connect('chess.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS saved_games
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
         uid TEXT,
         n INTEGER,
         path TEXT,
         initX INTEGER,
         initY INTEGER,
         save_loc INTEGER)
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index(): # 主页面
    uid = request.cookies.get("user")
    if not uid:
        uid = str(uuid.uuid4())
    response = make_response(render_template('index.html'))
    response.set_cookie("user", uid)
    return response

@app.route('/api/auto-check', methods=['POST'])
def auto_check(): # 检查当前棋盘是否可以继续完成
    data = request.json
    n = data.get('n')
    board = data.get('board')
    current_pos = data.get('current_pos')
    
    solver = ChessSolver(n, board, current_pos)
    solver.count()
    ans = solver.counter
    
    return jsonify({
        'check': ans != 0,
        'message': f'共有{ans}种解法' if ans <= 200 else f'还有至少200种解法'
    })

@app.route('/api/auto-move', methods=['POST'])
def auto_move(): # 自动完成剩余走棋步骤
    data = request.json
    n = data.get('n')
    board = data.get('board')
    current_pos = data.get('current_pos')
    
    solver = ChessSolver(n, board, current_pos)
    success = solver.solve()
    return jsonify({
        'success': success,
        'path': solver.path
    })

@app.route('/api/save', methods=['POST'])
def save_game(): # 保存残局棋盘
    uid = request.cookies.get("user")
    if not uid:
        return jsonify({
            'success': False,
            'message': '缺少用户标识数据'
        })

    data = request.json
    n = data.get('n')
    path = data.get('path')
    init_pos = data.get('init_pos')
    save_loc = data.get('save_loc')
    
    conn = sqlite3.connect('chess.db')
    c = conn.cursor()
    
    # 检查是否已存在该保存位
    c.execute('SELECT * FROM saved_games WHERE uid = ? AND save_loc = ?', (uid, save_loc))
    existing = c.fetchone()
    
    if existing:
        c.execute('UPDATE saved_games SET n=?, path=?, initX=?, initY=? WHERE uid=? AND save_loc=?',
                 (n, json.dumps(path), init_pos[0], init_pos[1], uid, save_loc))
    else:
        c.execute('INSERT INTO saved_games (uid, n, path, initX, initY, save_loc) VALUES (?, ?, ?, ?, ?, ?)',
                 (uid, n, json.dumps(path), init_pos[0], init_pos[1], save_loc))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': f'棋局已保存到位置{save_loc}'
    })

@app.route('/api/recall', methods=['GET'])
def recall_game(): # 从指定保存位恢复棋盘
    uid = request.cookies.get("user")
    if not uid:
        return jsonify({
            'success': False,
            'message': '缺少用户标识数据'
        })
    
    save_loc = request.args.get('save_loc', type=int)
    
    conn = sqlite3.connect('chess.db')
    c = conn.cursor()
    c.execute('SELECT n, path, initX, initY FROM saved_games WHERE uid = ? AND save_loc = ?', (uid, save_loc))
    result = c.fetchone()
    conn.close()
    
    if result:
        n, path_json, initX, initY = result
        return jsonify({
            'success': True,
            'n': n,
            'path': json.loads(path_json),
            'init_pos': [initX, initY]
        })
    else:
        return jsonify({
            'success': False,
            'message': f'保存位{save_loc}没有保存的棋局'
        })

@app.route('/api/download', methods=['POST'])
def download_game(): # 下载当前残局棋盘为JSON文件
    uid = request.cookies.get("user")
    if not uid:
        return jsonify({
            'success': False,
            'message': '缺少用户标识数据'
        })
    
    data = request.json
    
    filename = f"chess_game_{uid}.json"
    filepath = os.path.join('downloads', filename)
    
    os.makedirs('downloads', exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(request.json, f, ensure_ascii=False, indent=2)
    
    return send_file(filepath, as_attachment=True, download_name=f"马踏棋盘残局.json")

@app.route('/api/import', methods=['POST'])
def import_game(): # 上传棋盘JSON文件
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有上传文件'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'})
    
    try:
        data = json.load(file)

        return jsonify({
            'success': True,
            'n': data.get('n'),
            'path': data.get('path'),
            'init_pos': data.get('init_pos'),
            'message': '棋局导入成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'文件解析失败: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)