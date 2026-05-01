import sys
import heapq
from PIL import Image, ImageDraw, ImageFont


# ═══════════════════════════════════════════════════════════════
# NODO
# ═══════════════════════════════════════════════════════════════

class Node:
    def __init__(self, state, parent, action, g=0, h=0):
        self.state = state
        self.parent = parent
        self.action = action
        self.g = g
        self.h = h
        self.f = g + h

    def __lt__(self, other):
        return self.f < other.f


# ═══════════════════════════════════════════════════════════════
# FRONTERAS (EXPLORADORES)
# ═══════════════════════════════════════════════════════════════

class StackFrontier:
    """LIFO - para DFS"""
    def __init__(self):
        self.frontier = []

    def add(self, node):
        self.frontier.append(node)

    def remove(self):
        node = self.frontier[-1]
        self.frontier = self.frontier[:-1]
        return node

    def empty(self):
        return len(self.frontier) == 0

    def contains_state(self, state):
        return any(node.state == state for node in self.frontier)


class QueueFrontier(StackFrontier):
    """FIFO - para BFS"""
    def remove(self):
        node = self.frontier[0]
        self.frontier = self.frontier[1:]
        return node


class GreedyFrontier(StackFrontier):
    """Greedy Best-First"""
    def remove(self):
        self.frontier.sort(key=lambda n: n.h)
        node = self.frontier[0]
        self.frontier = self.frontier[1:]
        return node


class AstarFrontier:
    """Heap - para A*"""
    def __init__(self):
        self.heap = []
        self.counter = 0

    def add(self, node):
        heapq.heappush(self.heap, (node.f, self.counter, node))
        self.counter += 1

    def remove(self):
        _, _, node = heapq.heappop(self.heap)
        return node

    def empty(self):
        return len(self.heap) == 0

    def contains_state(self, state):
        return any(n.state == state for _, _, n in self.heap)


# ═══════════════════════════════════════════════════════════════
# LABERINTO
# ═══════════════════════════════════════════════════════════════

class Maze:
    
    # ──────────────────────────────────────────────────────────
    # INICIALIZACIÓN
    # ──────────────────────────────────────────────────────────
    
    def __init__(self, filename):
        with open(filename) as f:
            contents = f.read()

        if contents.count("A") != 1:
            raise Exception("maze must have exactly one start point")
        if contents.count("B") != 1:
            raise Exception("maze must have exactly one goal")

        contents = contents.splitlines()
        self.height = len(contents)
        self.width = max(len(line) for line in contents)

        # Construir mapa de muros
        self.walls = []
        for i in range(self.height):
            row = []
            for j in range(self.width):
                try:
                    if contents[i][j] == "A":
                        self.start = (i, j)
                        row.append(False)
                    elif contents[i][j] == "B":
                        self.goal = (i, j)
                        row.append(False)
                    elif contents[i][j] == " ":
                        row.append(False)
                    else:
                        row.append(True)
                except IndexError:
                    row.append(False)
            self.walls.append(row)

        # Estado
        self.solution = None
        self.scores = {}
        self.explored = set()
        self.num_explored = 0

    # ──────────────────────────────────────────────────────────
    # UTILIDADES
    # ──────────────────────────────────────────────────────────

    def heuristic(self, state, target=None):
        """Distancia Manhattan"""
        target = target or self.goal
        return abs(state[0] - target[0]) + abs(state[1] - target[1])

    def neighbors(self, state):
        """Retorna lista de (acción, estado_vecino) válidos"""
        row, col = state
        candidates = [
            ("up",    (row - 1, col)),
            ("down",  (row + 1, col)),
            ("left",  (row, col - 1)),
            ("right", (row, col + 1))
        ]
        return [
            (action, (r, c))
            for action, (r, c) in candidates
            if 0 <= r < self.height and 0 <= c < self.width and not self.walls[r][c]
        ]

    def _set_solution(self, goal_node):
        """Reconstruir solución desde nodo objetivo"""
        actions, cells = [], []
        node = goal_node
        while node.parent is not None:
            actions.append(node.action)
            cells.append(node.state)
            node = node.parent
        actions.reverse()
        cells.reverse()
        self.solution = (actions, cells)

    # ──────────────────────────────────────────────────────────
    # ALGORITMOS DE BÚSQUEDA
    # ──────────────────────────────────────────────────────────

    def solve_bfs(self):
        """Búsqueda en anchura (FIFO)"""
        self.num_explored = 0
        frontier = QueueFrontier()
        frontier.add(Node(self.start, None, None))
        self.explored = set()

        while True:
            if frontier.empty():
                raise Exception("no solution")
            
            node = frontier.remove()
            self.num_explored += 1
            
            if node.state == self.goal:
                self._set_solution(node)
                self.scores = {}
                return
            
            self.explored.add(node.state)
            for action, state in self.neighbors(node.state):
                if not frontier.contains_state(state) and state not in self.explored:
                    frontier.add(Node(state, node, action))

    def solve_dfs(self):
        """Búsqueda en profundidad (LIFO)"""
        self.num_explored = 0
        frontier = StackFrontier()
        frontier.add(Node(self.start, None, None))
        self.explored = set()

        while True:
            if frontier.empty():
                raise Exception("no solution")
            
            node = frontier.remove()
            self.num_explored += 1
            
            if node.state == self.goal:
                self._set_solution(node)
                self.scores = {}
                return
            
            self.explored.add(node.state)
            for action, state in self.neighbors(node.state):
                if not frontier.contains_state(state) and state not in self.explored:
                    frontier.add(Node(state, node, action))

    def solve_greedy(self):
        """Greedy Best-First Search"""
        self.num_explored = 0
        frontier = GreedyFrontier()
        frontier.add(Node(self.start, None, None, g=0, h=self.heuristic(self.start)))
        explored = {}

        while True:
            if frontier.empty():
                raise Exception("no solution")
            
            node = frontier.remove()
            if node.state in explored:
                continue
            
            self.num_explored += 1
            explored[node.state] = node

            if node.state == self.goal:
                self._set_solution(node)
                self.explored = set(explored.keys())
                self.scores = {s: {"label": str(n.h)} for s, n in explored.items()}
                return

            for action, state in self.neighbors(node.state):
                if state not in explored:
                    frontier.add(Node(state, node, action, g=node.g + 1, h=self.heuristic(state)))

    def solve_astar(self):
        """A* Search"""
        self.num_explored = 0
        frontier = AstarFrontier()
        frontier.add(Node(self.start, None, None, g=0, h=self.heuristic(self.start)))

        explored = {}
        best_g = {self.start: 0}

        while True:
            if frontier.empty():
                raise Exception("no solution")

            node = frontier.remove()

            # Ignorar nodos obsoletos
            if node.g > best_g.get(node.state, float("inf")):
                continue

            if node.state in explored:
                continue

            self.num_explored += 1
            explored[node.state] = node

            if node.state == self.goal:
                self._set_solution(node)
                self.explored = set(explored.keys())
                self.scores = {s: {"label": f"{n.g}+{n.h}"} for s, n in explored.items()}
                return

            for action, state in self.neighbors(node.state):
                new_g = node.g + 1

                if new_g < best_g.get(state, float("inf")):
                    best_g[state] = new_g
                    h = self.heuristic(state)
                    frontier.add(Node(state, node, action, g=new_g, h=h))

    def solve_bigreedy(self):
        """Greedy Bidireccional"""
        self.num_explored = 0

        fwd_open = [Node(self.start, None, None, h=self.heuristic(self.start, self.goal))]
        bwd_open = [Node(self.goal, None, None, h=self.heuristic(self.goal, self.start))]
        fwd_explored = {}
        bwd_explored = {}
        meet_state = None

        def step(frontier_list, explored, other_explored, target):
            nonlocal meet_state
            if not frontier_list:
                return
            frontier_list.sort(key=lambda n: n.h)
            node = frontier_list.pop(0)
            if node.state in explored:
                return
            explored[node.state] = node
            self.num_explored += 1
            if node.state in other_explored and meet_state is None:
                meet_state = node.state
            for action, state in self.neighbors(node.state):
                if state not in explored:
                    frontier_list.append(Node(state, node, action, h=self.heuristic(state, target)))

        while (fwd_open or bwd_open) and not meet_state:
            step(fwd_open, fwd_explored, bwd_explored, self.goal)
            if meet_state:
                break
            step(bwd_open, bwd_explored, fwd_explored, self.start)

        if not meet_state:
            raise Exception("no solution")

        fwd_path = []
        cur = fwd_explored[meet_state]
        while cur:
            fwd_path.append(cur.state)
            cur = cur.parent
        fwd_path.reverse()

        bwd_path = []
        cur = bwd_explored[meet_state].parent
        while cur:
            bwd_path.append(cur.state)
            cur = cur.parent

        self.solution = ([], fwd_path + bwd_path)
        self.explored = set(fwd_explored.keys()) | set(bwd_explored.keys())

        self.scores = {}
        for s in {**fwd_explored, **bwd_explored}:
            hf = self.heuristic(s, self.goal)
            hb = self.heuristic(s, self.start)
            self.scores[s] = {"label": f"{hf}+{hb}"}

    def compute_scores_only(self, algorithm):
        """Calcula scores en todas las celdas sin resolver"""
        self.scores = {}
        self.solution = None
        self.explored = set()
        self.num_explored = 0

        for i in range(self.height):
            for j in range(self.width):
                if not self.walls[i][j]:
                    if algorithm == "greedy":
                        h = self.heuristic((i, j), self.goal)
                        self.scores[(i, j)] = {"label": str(h)}
                    elif algorithm == "bigreedy":
                        hf = self.heuristic((i, j), self.goal)
                        hb = self.heuristic((i, j), self.start)
                        self.scores[(i, j)] = {"label": f"{hf}+{hb}"}

    # ──────────────────────────────────────────────────────────
    # DISPATCHER
    # ──────────────────────────────────────────────────────────

    def solve(self, algorithm="astar"):
        """Resuelve el laberinto con el algoritmo especificado"""
        dispatchers = {
            "greedy":   self.solve_greedy,
            "astar":    self.solve_astar,
            "bigreedy": self.solve_bigreedy,
            "bfs":      self.solve_bfs,
            "dfs":      self.solve_dfs,
        }
        if algorithm not in dispatchers:
            raise Exception(f"Algoritmo desconocido: {algorithm}. "
                            f"Opciones: {list(dispatchers.keys())}")
        dispatchers[algorithm]()

    # ──────────────────────────────────────────────────────────
    # SALIDA EN TERMINAL
    # ──────────────────────────────────────────────────────────

    def print(self, show_scores=False):
        """Imprime el laberinto en terminal"""
        solution = self.solution[1] if self.solution else None
        print()
        for i, row in enumerate(self.walls):
            for j, col in enumerate(row):
                if col:
                    print("█", end="")
                elif (i, j) == self.start:
                    print("A", end="")
                elif (i, j) == self.goal:
                    print("B", end="")
                elif solution and (i, j) in solution:
                    print("*", end="")
                elif show_scores and (i, j) in self.scores:
                    label = self.scores[(i, j)]["label"]
                    print(label[-1], end="")
                else:
                    print(" ", end="")
            print()
        print()

    def print_scores(self):
        """Imprime los scores de cada celda"""
        if not self.scores:
            print("  (sin scores — BFS/DFS no calculan heurística)")
            return
        print("\n── Scores por celda ──")
        for state in sorted(self.scores):
            label = self.scores[state]["label"]
            if "+" in label:
                parts = label.split("+")
                total = sum(int(p) for p in parts)
                print(f"  {state}:  {label}  =  {total}")
            else:
                print(f"  {state}:  {label}")

    # ──────────────────────────────────────────────────────────
    # SALIDA EN IMAGEN
    # ──────────────────────────────────────────────────────────

    def output_image(self, filename, show_solution=True,
                     show_explored=False, show_scores=False):
        """Genera imagen PNG del laberinto"""
        cell_size = 60
        cell_border = 2

        img = Image.new(
            "RGBA",
            (self.width * cell_size, self.height * cell_size),
            "black"
        )
        draw = ImageDraw.Draw(img)

        try:
            font_big = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
            font_small = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        except Exception:
            font_big = ImageFont.load_default()
            font_small = font_big

        solution = self.solution[1] if self.solution else None

        for i, row in enumerate(self.walls):
            for j, col in enumerate(row):
                # Determinar color
                if col:
                    fill = (40, 40, 40)
                elif (i, j) == self.start:
                    fill = (255, 0, 0)
                elif (i, j) == self.goal:
                    fill = (0, 171, 28)
                elif solution and show_solution and (i, j) in solution:
                    fill = (220, 235, 113)
                elif show_explored and (i, j) in self.explored:
                    fill = (212, 97, 85)
                else:
                    fill = (237, 240, 252)

                # Dibujar celda
                x0 = j * cell_size + cell_border
                y0 = i * cell_size + cell_border
                x1 = (j + 1) * cell_size - cell_border
                y1 = (i + 1) * cell_size - cell_border
                draw.rectangle([(x0, y0), (x1, y1)], fill=fill)

                cx = j * cell_size + cell_size // 2
                cy = i * cell_size + cell_size // 2

                # Etiqueta A / B
                if (i, j) == self.start:
                    draw.text((cx, cy), "A", fill=(255, 255, 255),
                              font=font_big, anchor="mm")
                elif (i, j) == self.goal:
                    draw.text((cx, cy), "B", fill=(255, 255, 255),
                              font=font_big, anchor="mm")

                # Scores
                elif show_scores and not col and (i, j) in self.scores:
                    label = self.scores[(i, j)]["label"]
                    text_color = (60, 60, 60) if fill == (237, 240, 252) else (255, 255, 255)

                    if "+" in label:
                        parts = label.split("+")
                        draw.text((cx, cy - 8), parts[0] + "+",
                                  fill=text_color, font=font_small, anchor="mm")
                        draw.text((cx, cy + 8), parts[1],
                                  fill=text_color, font=font_small, anchor="mm")
                    else:
                        draw.text((cx, cy), label,
                                  fill=text_color, font=font_big, anchor="mm")

        img.save(filename)
        print(f"  Imagen guardada: {filename}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: python maze.py maze.txt [greedy|astar|bigreedy|bfs|dfs]")

    algorithm = sys.argv[2] if len(sys.argv) >= 3 else "astar"

    m = Maze(sys.argv[1])

    print("Maze:")
    m.print()

    # Greedy y bigreedy → solo mostrar números
    if algorithm in ("greedy", "bigreedy"):
        print(f"\nModo visualización: {algorithm.upper()}")
        print("(se calculan los números en todas las celdas, sin buscar solución)\n")
        m.compute_scores_only(algorithm)
        m.print_scores()
        m.output_image("maze.png", show_explored=False, show_scores=True)

    # Astar, BFS, DFS → buscar solución
    else:
        print(f"Solving with: {algorithm.upper()}...")
        m.solve(algorithm=algorithm)
        print(f"States Explored: {m.num_explored}")
        print(f"Solution length: {len(m.solution[1]) if m.solution else 0} steps")
        print("\nSolution:")
        m.print()
        m.print_scores()
        print("\nGenerating image...")
        m.output_image("maze.png", show_explored=True, show_scores=True)