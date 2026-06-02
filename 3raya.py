"""
Tres en Raya con Minimax
Requiere: pip install pygame
"""
import pygame, sys, math

# ── Configuración ──────────────────────────────────────────
WIDTH, HEIGHT = 560, 700
CELL = 140
BOARD_X, BOARD_Y = 60, 80   # esquina del tablero
LINE_W = 4

# Colores
BG       = (15, 12, 30)
GRID     = (60, 55, 100)
X_CLR    = (255, 90, 120)
O_CLR    = (60, 200, 255)
WIN_CLR  = (255, 220, 60)
TEXT_W   = (220, 215, 255)
TEXT_DIM = (100, 95, 140)
BTN_BG   = (35, 28, 70)
BTN_HOV  = (65, 55, 130)
BTN_BRD  = (90, 70, 180)

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Tres en Raya · Minimax")
clock = pygame.time.Clock()

def font(size, bold=False):
    return pygame.font.SysFont("Segoe UI", size, bold=bold)

F_BIG  = font(38, bold=True)
F_MED  = font(24)
F_SMALL= font(19)

# ── Lógica del tablero ─────────────────────────────────────
def new_board():
    return [None] * 9          # índices 0-8, fila-major

def winner(b):
    wins = [(0,1,2),(3,4,5),(6,7,8),  # filas
            (0,3,6),(1,4,7),(2,5,8),  # columnas
            (0,4,8),(2,4,6)]          # diagonales
    for a,c2,d in wins:
        if b[a] and b[a] == b[c2] == b[d]:
            return b[a], (a, d)
    return None, None

def is_full(b):
    return all(b)

def empty_cells(b):
    return [i for i, v in enumerate(b) if v is None]

# ── Minimax ────────────────────────────────────────────────
def minimax(b, is_max, ai, human):
    w, _ = winner(b)
    if w == ai:    return  10
    if w == human: return -10
    if is_full(b): return   0

    scores = []
    for i in empty_cells(b):
        b[i] = ai if is_max else human
        scores.append(minimax(b, not is_max, ai, human))
        b[i] = None

    return max(scores) if is_max else min(scores)

def best_move(b, ai, human):
    best_score, best_i = -math.inf, None
    for i in empty_cells(b):
        b[i] = ai
        s = minimax(b, False, ai, human)
        b[i] = None
        if s > best_score:
            best_score, best_i = s, i
    return best_i

# ── Estado global ──────────────────────────────────────────
HUMAN = "X"
AI    = "O"

def reset():
    return {
        "board"    : new_board(),
        "turn"     : HUMAN,
        "over"     : False,
        "winner"   : None,
        "win_cells": None,   # (idx_inicio, idx_fin)
        "ai_delay" : 0.0,
    }

state = reset()

# ── Coordenadas ────────────────────────────────────────────
def cell_rect(i):
    r, c = divmod(i, 3)
    x = BOARD_X + c * CELL
    y = BOARD_Y + r * CELL
    return pygame.Rect(x, y, CELL, CELL)

def cell_center(i):
    r = cell_rect(i)
    return r.centerx, r.centery

def pos_to_index(mx, my):
    c = (mx - BOARD_X) // CELL
    r = (my - BOARD_Y) // CELL
    if 0 <= r < 3 and 0 <= c < 3:
        return r * 3 + c
    return None

# ── Dibujo ─────────────────────────────────────────────────
def draw_bg():
    screen.fill(BG)
    # Cuadrícula de puntos decorativa
    for x in range(0, WIDTH, 30):
        for y in range(0, HEIGHT, 30):
            pygame.draw.circle(screen, (30, 26, 55), (x, y), 1)

def draw_grid():
    # Líneas internas del tablero
    for i in range(1, 3):
        x = BOARD_X + i * CELL
        y = BOARD_Y + i * CELL
        pygame.draw.line(screen, GRID, (x, BOARD_Y + 8), (x, BOARD_Y + 3*CELL - 8), LINE_W)
        pygame.draw.line(screen, GRID, (BOARD_X + 8, y), (BOARD_X + 3*CELL - 8, y), LINE_W)
    # Borde exterior
    pygame.draw.rect(screen, GRID,
                     (BOARD_X, BOARD_Y, 3*CELL, 3*CELL), LINE_W, border_radius=10)

def draw_x(cx, cy, half=44):
    pygame.draw.line(screen, X_CLR, (cx-half, cy-half), (cx+half, cy+half), 8)
    pygame.draw.line(screen, X_CLR, (cx+half, cy-half), (cx-half, cy+half), 8)

def draw_o(cx, cy, r=44):
    pygame.draw.circle(screen, O_CLR, (cx, cy), r, 8)

def draw_pieces(b):
    for i, val in enumerate(b):
        if val is None: continue
        cx, cy = cell_center(i)
        if val == HUMAN: draw_x(cx, cy)
        else:            draw_o(cx, cy)

def draw_win_line(win_cells):
    if win_cells is None: return
    p1 = cell_center(win_cells[0])
    p2 = cell_center(win_cells[1])
    pygame.draw.line(screen, WIN_CLR, p1, p2, 6)

def draw_hover(b, turn, over):
    if over or turn != HUMAN: return
    mx, my = pygame.mouse.get_pos()
    i = pos_to_index(mx, my)
    if i is not None and b[i] is None:
        r = cell_rect(i)
        s = pygame.Surface((CELL, CELL), pygame.SRCALPHA)
        pygame.draw.rect(s, (200, 170, 255, 18), (0, 0, CELL, CELL))
        screen.blit(s, r.topleft)

def draw_status(s):
    # Título
    title = F_MED.render("TRES EN RAYA", True, TEXT_DIM)
    screen.blit(title, (WIDTH//2 - title.get_width()//2, 22))

    # Turno / resultado
    if s["over"]:
        w = s["winner"]
        if w == "TIE":  msg, clr = "Empate", TEXT_DIM
        elif w == HUMAN: msg, clr = "¡Ganaste!", X_CLR
        else:            msg, clr = "Gana la IA", O_CLR
    else:
        if s["turn"] == HUMAN: msg, clr = "Tu turno  (X)", X_CLR
        else:                   msg, clr = "IA pensando... (O)", O_CLR

    lbl = F_BIG.render(msg, True, clr)
    screen.blit(lbl, (WIDTH//2 - lbl.get_width()//2, BOARD_Y + 3*CELL + 20))

def draw_button(label, rect):
    hov = rect.collidepoint(pygame.mouse.get_pos())
    pygame.draw.rect(screen, BTN_HOV if hov else BTN_BG, rect, border_radius=8)
    pygame.draw.rect(screen, BTN_BRD, rect, 2, border_radius=8)
    t = F_SMALL.render(label, True, TEXT_W)
    screen.blit(t, (rect.centerx - t.get_width()//2, rect.centery - t.get_height()//2))
    return hov

BTN = pygame.Rect(WIDTH//2 - 100, HEIGHT - 60, 200, 40)

# ── Bucle principal ────────────────────────────────────────
while True:
    dt = clock.tick(60) / 1000.0
    s  = state

    # Eventos
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit(); sys.exit()

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            mx, my = event.pos

            # Botón reiniciar
            if BTN.collidepoint(mx, my):
                state = reset()
                continue

            # Click en celda
            if not s["over"] and s["turn"] == HUMAN:
                i = pos_to_index(mx, my)
                if i is not None and s["board"][i] is None:
                    s["board"][i] = HUMAN
                    w, wl = winner(s["board"])
                    if w:
                        s["winner"] = w; s["win_cells"] = wl; s["over"] = True
                    elif is_full(s["board"]):
                        s["winner"] = "TIE"; s["over"] = True
                    else:
                        s["turn"] = AI; s["ai_delay"] = 0.4

    # Turno IA
    if not s["over"] and s["turn"] == AI:
        s["ai_delay"] -= dt
        if s["ai_delay"] <= 0:
            mv = best_move(s["board"], AI, HUMAN)
            if mv is not None:
                s["board"][mv] = AI
            w, wl = winner(s["board"])
            if w:
                s["winner"] = w; s["win_cells"] = wl; s["over"] = True
            elif is_full(s["board"]):
                s["winner"] = "TIE"; s["over"] = True
            else:
                s["turn"] = HUMAN

    # Render
    draw_bg()
    draw_grid()
    draw_hover(s["board"], s["turn"], s["over"])
    draw_pieces(s["board"])
    draw_win_line(s["win_cells"])
    draw_status(s)
    draw_button("↺  Nueva partida", BTN)
    pygame.display.flip()   