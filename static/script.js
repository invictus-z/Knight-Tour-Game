class ChessGame {
    constructor() {
        this.n = 8;
        this.board = [];
        this.path = [];
        this.currentPos = null;
        this.stepCount = 0;

        this.isAutoMoving = false;
        this.remainingMoves = [];
        this.animationPromise = null;

        this.directions = [
            [2, 1], [1, 2], [-1, 2], [-2, 1],
            [-2, -1], [-1, -2], [1, -2], [2, -1]
        ];
        
        this.initEventListeners();
        this.generateBoard();
    }

    initEventListeners() {
        // 生成棋盘
        document.getElementById('generateBoard').addEventListener('click', () => {         
            this.generateBoard();
        });

        // 重置棋盘
        document.getElementById('resetBoard').addEventListener('click', () => {
            this.resetBoard();
        });

        // 检查可行性
        document.getElementById('autoCheck').addEventListener('click', () => {
            this.autoCheck();
        });

        // 自动走棋
        document.getElementById('autoMove').addEventListener('click', () => {
            this.autoMove();
        });

        // 暂停自动走棋
        document.getElementById('pauseAutoMove').addEventListener('click', () => {
            this.pauseAutoMove();
        });

        // 悔棋
        document.getElementById('undoMove').addEventListener('click', () => {
            this.undoMove();
        });

        // 保存和恢复
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveGame(document.getElementById('save-loc').value);
        });
        document.getElementById('recallBtn').addEventListener('click', () => {
            this.recallGame(document.getElementById('recall-loc').value);
        });

        // 文件操作
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadGame();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importGame(e.target.files[0]);
        });
    }

    resetBoard() {
        this.board = Array(this.n).fill().map(() => Array(this.n).fill(0));
        this.path = [];
        this.stepCount = 0;
        
        // 随机选择起始位置
        const startX = Math.floor(Math.random() * this.n);
        const startY = Math.floor(Math.random() * this.n);
        this.initPos = [startX, startY]
        this.currentPos = [startX, startY];
        this.board[startX][startY] = 1;
        this.stepCount = 1;

        this.renderBoard();
        document.getElementById('stepCount').textContent = this.stepCount;
        document.getElementById('totalSteps').textContent = this.n * this.n;
        this.showMessage(`棋盘已生成 ${this.n}x${this.n}，马在位置 (${startX}, ${startY})`);
    }

    generateBoard() {
        this.n = parseInt(document.getElementById('boardSize').value);
        this.resetBoard();
    }

    renderBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';
        chessboard.style.gridTemplateColumns = `repeat(${this.n}, 1fr)`;

        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(i + j) % 2 === 0 ? 'light' : 'dark'}`;
                cell.dataset.x = i;
                cell.dataset.y = j;

                if (i === this.currentPos[0] && j === this.currentPos[1]) {
                    cell.classList.add('current');
                    cell.textContent = '马';
                }
                else if (this.board[i][j] !== 0) {
                    cell.textContent = this.board[i][j];
                    cell.classList.add('visited');
                }
                
                if (this.isPossibleMove(i, j)) {
                    cell.classList.add('possible');
                    cell.textContent = '$';
                }

                cell.addEventListener('click', () => this.handleCellClick(i, j));
                chessboard.appendChild(cell);
            }
        }

        document.getElementById('totalSteps').textContent = this.n * this.n;
        document.getElementById('stepCount').textContent = this.stepCount;
    }

    isPossibleMove(x, y) {
        if (this.board[x][y] !== 0) return false;

        const [currentX, currentY] = this.currentPos;
        const dx = Math.abs(x - currentX);
        const dy = Math.abs(y - currentY);
        
        return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
    }

    handleCellClick(x, y) {        
        if (this.isPossibleMove(x, y)) {
            this.makeMove(x, y);
        } else if (this.board[x][y] === 0) {
            this.showMessage('移动不合法！');
        } else {
            this.showMessage('目标位置已步过！');
        }
    }

    makeMove(x, y) {
        this.stepCount++;
        this.board[x][y] = this.stepCount;
        
        const [currentX, currentY] = this.currentPos;
        const dx = x - currentX;
        const dy = y - currentY;
        
        const direction = this.directions.findIndex(([dirX, dirY]) => dirX === dx && dirY === dy) + 1;
        this.path.push(direction); // 更新路径栈
        
        this.currentPos = [x, y];
        this.renderBoard();
        document.getElementById('stepCount').textContent = this.stepCount;

        if (this.stepCount === this.n * this.n) {
            this.showMessage('恭喜！你成功完成了马踏棋盘！');
        }
    }

    undoMove() {
        if (this.path.length === 0) {
            this.showMessage('无法悔棋！');
            return;
        }

        const [currentX, currentY] = this.currentPos;
        this.board[currentX][currentY] = 0;
        const lastDirection = this.path.pop();
        this.stepCount--;
        
        const [dx, dy] = this.directions[lastDirection - 1];
        this.currentPos = [currentX - dx, currentY - dy];

        this.renderBoard();
        document.getElementById('stepCount').textContent = this.stepCount;
        this.showMessage('悔棋一步');
    }

    async autoCheck() {
        try {
            const response = await fetch('/api/auto-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    n: this.n,
                    board: this.board,
                    current_pos: this.currentPos
                })
            });

            const data = await response.json();
            this.showMessage(data.message);
        } catch (error) {
            this.showMessage('检查失败: ' + error.message);
        }
    }

    pauseAutoMove() {
        if (this.isAutoMoving) {
            this.isAutoMoving = false;
            
            if (this.animationPromise) {
                this.animationPromise.cancel = true;
            }
            
            this.remainingMoves = [];
            
            this.showMessage('自动走棋已暂停，未走步骤已清除');
        } else {
            this.showMessage('当前没有进行中的自动走棋');
        }
    }

    async autoMove() {
        if (this.isAutoMoving) {
            this.showMessage('自动走棋正在进行中');
            return;
        }

        try {
            const response = await fetch('/api/auto-move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    n: this.n,
                    board: this.board,
                    current_pos: this.currentPos
                })
            });

            const data = await response.json();
            
            if (data.success && data.path && data.path.length > 0) {
                this.isAutoMoving = true;
                this.remainingMoves = [...data.path];
                await this.animateMoves(data.path);
                
                if (this.isAutoMoving) {
                    this.isAutoMoving = false;
                    this.remainingMoves = [];
                    this.showMessage('自动走棋完成！');
                }
            } else {
                this.showMessage('无法自动走棋');
            }
        } catch (error) {
            this.isAutoMoving = false;
            this.remainingMoves = [];
            this.showMessage('自动走棋失败: ' + error.message);
        }
    }

    async animateMoves(moves) {
        for (const [index, move] of moves.entries()) {
            if (!this.isAutoMoving) {
                this.remainingMoves = moves.slice(index);
                break;
            }
            
            this.animationPromise = new Promise((resolve) => {
                const timer = setTimeout(resolve, 1000);
                if (this.animationPromise) {
                    this.animationPromise.cancel = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                }
            });
            
            await this.animationPromise;
            
            if (!this.isAutoMoving) {
                this.remainingMoves = moves.slice(index);
                break;
            }
            
            const [dx, dy] = this.directions[move];
            const [currentX, currentY] = this.currentPos;
            const newX = currentX + dx;
            const newY = currentY + dy;
            
            this.makeMove(newX, newY);
            
            this.remainingMoves = moves.slice(index + 1);
        }
        
        this.animationPromise = null;
    }

    async saveGame(loc) {
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    n: this.n,
                    path: this.path,
                    init_pos: this.initPos,
                    save_loc: parseInt(loc)
                })
            });

            const data = await response.json();
            this.showMessage(data.message);
        } catch (error) {
            this.showMessage('保存失败: ' + error.message);
        }
    }

    async recallGame(loc) {
        if (!confirm('恢复棋局将清空当前棋盘，是否继续？')) return;

        try {
            const response = await fetch(`/api/recall?save_loc=${loc}`);
            const data = await response.json();

            if (data.success) {
                this.n = data.n;
                this.path = data.path;
                this.initPos = data.init_pos
                this.reconstructBoard();
                this.showMessage(`已恢复保存位${loc}的棋局`);
            } else {
                this.showMessage(data.message);
            }
        } catch (error) {
            this.showMessage('恢复失败: ' + error.message);
        }
    }

    reconstructBoard() {
        // 重新构建棋盘状态
        this.board = Array(this.n).fill().map(() => Array(this.n).fill(0));
        this.stepCount = 0;

        let currentX = this.initPos[0], currentY = this.initPos[1];
        this.board[currentX][currentY] = ++this.stepCount;

        // 按照路径栈重新走棋
        for (const move of this.path) {
            const [dx, dy] = this.directions[move - 1];
            currentX += dx;
            currentY += dy;
            this.board[currentX][currentY] = ++this.stepCount;
        }

        this.currentPos = [currentX, currentY];
        this.renderBoard();
        document.getElementById('stepCount').textContent = this.stepCount;
    }

    async downloadGame() {
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    n: this.n,
                    path: this.path,
                    init_pos: this.initPos
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `马踏棋盘_${this.n}x${this.n}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('棋局文件已下载');
        } catch (error) {
            this.showMessage('下载失败: ' + error.message);
        }
    }

    async importGame(file) {
        if (!file) return;

        if (!confirm('导入棋局将清空当前棋盘，是否继续？')) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.n = data.n;
                this.path = data.path;
                this.initPos = data.init_pos;
                this.reconstructBoard();
                this.showMessage('棋局导入成功');
            } else {
                this.showMessage(data.message);
            }
        } catch (error) {
            this.showMessage('导入失败: ' + error.message);
        }
    }


    showMessage(message) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        
        setTimeout(() => {
            if (messageElement.textContent === message) {
                messageElement.textContent = '';
            }
        }, 5000);
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});