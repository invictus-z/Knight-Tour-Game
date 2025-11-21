class ChessSolver:
    def __init__(self, n, board, current_pos):
        self.n = n
        self.board = [row.copy() for row in board] # 深拷贝
        self.current_pos = current_pos
        self.moves = [
            (2, 1), (1, 2), (-1, 2), (-2, 1),
            (-2, -1), (-1, -2), (1, -2), (2, -1)
        ] # 八种跳法
        self.path = [] # 步数栈
        self.steps = self.n * self.n - sum(1 for row in self.board for _ in row if _ != 0) # 还需要完成的步数
        self.counter = 0 # 统计解个数
    
    def go_back(self):
        if len(self.path) == 0:
            return False
        self.board[self.current_pos[0]][self.current_pos[1]] = 0
        idx = self.path.pop()
        self.current_pos = (self.current_pos[0] - self.moves[idx][0], self.current_pos[1] - self.moves[idx][1])
        self.steps += 1
        return True
    
    def go_ahead(self, idx):
        self.path.append(idx)
        self.current_pos = (self.current_pos[0] + self.moves[idx][0], self.current_pos[1] + self.moves[idx][1])
        self.board[self.current_pos[0]][self.current_pos[1]] = 1
        self.steps -= 1
    
    def within_board_check(self, x, y):
        return 0 <= x < self.n and 0 <= y < self.n
    
    def next_moves(self): # Warnsdorff贪心策略，优先选择后续可走路线最少的节点
        moves = []
        x, y = self.current_pos
        for i, (dx, dy) in enumerate(self.moves):
            nx, ny = x + dx, y + dy
            if self.within_board_check(nx, ny) and self.board[nx][ny] == 0:
                ways = 0
                for dx2, dy2 in self.moves:
                    if self.within_board_check(nx + dx2, ny + dy2) and self.board[nx + dx2][ny + dy2] == 0:
                        ways += 1
                moves.append((i, ways))
        return sorted(moves, key=lambda x:x[-1]) # 按可走路线数量升序返回
    
    def solve(self): # 解决剩余路径 DFS
        if self.steps == 0:
            return True
        
        for move_idx, _ in self.next_moves():
            self.go_ahead(move_idx)
            if self.solve(): return True
            self.go_back()
        
        return False
    
    def count(self): # 统计剩余解个数 DFS
        if self.steps == 0:
            self.counter += 1
            if self.counter > 200:
                return True # 快速解决所有堆栈
        
        for move_idx, _ in self.next_moves():
            self.go_ahead(move_idx)
            if self.count(): return True
            self.go_back()

        return False