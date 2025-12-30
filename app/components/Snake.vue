<template>
  <div
    class="snake-game"
    :class="{
      'snake-game--in-game': isInGame,
    }"
  >
    <div class="snake-game__container">
      <div class="snake-game__header">
        <h1 class="snake-game__title">ЗМЕЙКА</h1>
        <div class="snake-game__score">{{ gameState.score.toString().padStart(4, "0") }}</div>
      </div>

      <div class="snake-game__controls">
        <p class="snake-game__instructions">Используй WASD или стрелочки для управления</p>
        <div class="snake-game__buttons">
          <CButton @click="startGame" :disabled="gameState.isPlaying">
            {{ gameState.isPlaying ? "ИДЕТ ИГРА" : "НАЧАТЬ" }}
          </CButton>
          <!-- <CButton variant="secondary" @click="resetGame"> СБРОСИТЬ </CButton> -->
        </div>
      </div>
      <div class="snake-game__board-stats-controls-wrapper">
        <div class="snake-game__board-container">
          <div
            ref="gameBoard"
            class="snake-game__board"
            :class="{
              'snake-game__board--loading': gameState.isLoading,
              'snake-game__board--game-over': gameState.isGameOver,
            }"
            tabindex="0"
            @keydown="handleKeyPress"
          >
            <!-- Loading state -->
            <div v-if="gameState.isLoading" class="snake-game__loading">
              <div class="snake-game__loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p class="snake-game__loading-text">Загрузка...</p>
            </div>

            <!-- Game Over overlay -->
            <div v-if="gameState.isGameOver && !gameState.isLoading" class="snake-game__game-over">
              <h2 class="snake-game__game-over-title">Игра окончена</h2>
              <p class="snake-game__game-over-score">
                Результат: {{ gameState.score.toString().padStart(4, "0") }}
              </p>
              <CButton class="snake-game__button snake-game__button--primary" @click="resetGame">
                НАЧАТЬ СНАЧАЛА
              </CButton>
            </div>

            <!-- Game grid -->
            <div
              v-if="!gameState.isLoading"
              class="snake-game__grid"
              :style="{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
              }"
            >
              <div
                v-for="(cell, index) in gameGrid"
                :key="index"
                class="snake-game__cell"
                :class="{
                  'snake-game__cell--snake': cell === CellType.Snake,
                  'snake-game__cell--snake-head': cell === CellType.SnakeHead,
                  'snake-game__cell--food': cell === CellType.Food,
                  'snake-game__cell--empty': cell === CellType.Empty,
                }"
              >
                <!-- Snake head eyes for visual direction indication -->
                <div
                  v-if="cell === CellType.SnakeHead"
                  class="snake-game__snake-eyes"
                  :class="`snake-game__snake-eyes--${direction.toLowerCase()}`"
                >
                  <span class="snake-game__eye"></span>
                  <span class="snake-game__eye"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="snake-game__stats-controls-wrapper">
          <!-- Virtual controls - Always visible, positioned below game board -->
          <div class="snake-game__virtual-controls">
            <div class="snake-game__dpad">
              <button
                class="snake-game__dpad-button snake-game__dpad-button--up"
                @click="handleDirectionChange(Direction.Up)"
                :disabled="!gameState.isPlaying"
              >
                ↑
              </button>
              <div class="snake-game__dpad-middle">
                <button
                  class="snake-game__dpad-button snake-game__dpad-button--left"
                  @click="handleDirectionChange(Direction.Left)"
                  :disabled="!gameState.isPlaying"
                >
                  ←
                </button>
                <div class="snake-game__dpad-center"></div>
                <button
                  class="snake-game__dpad-button snake-game__dpad-button--right"
                  @click="handleDirectionChange(Direction.Right)"
                  :disabled="!gameState.isPlaying"
                >
                  →
                </button>
              </div>
              <button
                class="snake-game__dpad-button snake-game__dpad-button--down"
                @click="handleDirectionChange(Direction.Down)"
                :disabled="!gameState.isPlaying"
              >
                ↓
              </button>
            </div>
          </div>

          <div class="snake-game__stats">
            <div class="snake-game__stat">
              <span class="snake-game__stat-label">Длина</span>
              <span class="snake-game__stat-value">{{
                snake.length.toString().padStart(3, "0")
              }}</span>
            </div>
            <div class="snake-game__stat">
              <span class="snake-game__stat-label">Макс. результат</span>
              <span class="snake-game__stat-value">{{
                gameState.highScore.toString().padStart(4, "0")
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";

// Type definitions following clean architecture principles
interface Position {
  x: number;
  y: number;
}

enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

enum CellType {
  Empty = "EMPTY",
  Snake = "SNAKE",
  SnakeHead = "SNAKE_HEAD",
  Food = "FOOD",
}

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  isLoading: boolean;
  score: number;
  highScore: number;
}

// Game constants - following clean code naming conventions
const BOARD_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;
const GAME_SPEED = 200; // milliseconds - slower for 90s feel
const LOADING_DURATION = 1000; // milliseconds

// Reactive state management - centralized and typed
const gameState = reactive<GameState>({
  isPlaying: false,
  isGameOver: false,
  isLoading: false,
  score: 0,
  highScore: 0,
});
const isInGame = computed(
  () => gameState.isPlaying || gameState.isGameOver || gameState.isLoading,
);
const snake = ref<Position[]>([]);
const food = ref<Position>({ x: 0, y: 0 });
const direction = ref<Direction>(Direction.Right);
const pendingDirection = ref<Direction>(Direction.Right); // Fix for rapid direction changes
const gameBoard = ref<HTMLElement>();
const gameLoopTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);

// Computed properties for derived state
const gameGrid = computed<CellType[]>(() => {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(CellType.Empty);

  // Mark snake cells
  snake.value.forEach((segment, index) => {
    const cellIndex = segment.y * BOARD_SIZE + segment.x;
    if (cellIndex >= 0 && cellIndex < grid.length) {
      grid[cellIndex] = index === 0 ? CellType.SnakeHead : CellType.Snake;
    }
  });

  // Mark food cell
  const foodIndex = food.value.y * BOARD_SIZE + food.value.x;
  if (foodIndex >= 0 && foodIndex < grid.length) {
    grid[foodIndex] = CellType.Food;
  }

  return grid;
});

// Pure functions following functional programming principles
const initializeSnake = (): Position[] => {
  const centerX = Math.floor(BOARD_SIZE / 2);
  const centerY = Math.floor(BOARD_SIZE / 2);

  return Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, index) => ({
    x: centerX - index,
    y: centerY,
  }));
};

const generateRandomFood = (): Position => {
  let newFood: Position;
  let attempts = 0;
  const maxAttempts = BOARD_SIZE * BOARD_SIZE;

  do {
    newFood = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
    attempts++;
  } while (
    attempts < maxAttempts &&
    snake.value.some(
      (segment) => segment.x === newFood.x && segment.y === newFood.y,
    )
  );

  return newFood;
};

const isValidPosition = (pos: Position): boolean => {
  return pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE;
};

const hasCollision = (head: Position): boolean => {
  // Wall collision
  if (!isValidPosition(head)) return true;

  // Self collision - check against snake body (excluding head)
  return snake.value
    .slice(1)
    .some((segment) => segment.x === head.x && segment.y === head.y);
};

const getNextPosition = (
  currentHead: Position,
  currentDirection: Direction,
): Position => {
  const directionMap: Record<Direction, Position> = {
    [Direction.Up]: { x: 0, y: -1 },
    [Direction.Down]: { x: 0, y: 1 },
    [Direction.Left]: { x: -1, y: 0 },
    [Direction.Right]: { x: 1, y: 0 },
  };

  const delta = directionMap[currentDirection];
  return {
    x: currentHead.x + delta.x,
    y: currentHead.y + delta.y,
  };
};

// Game state management functions
const resetGameState = (): void => {
  gameState.isPlaying = false;
  gameState.isGameOver = false;
  gameState.isLoading = false;
  gameState.score = 0;

  // Clear any existing game loop
  if (gameLoopTimeoutId.value) {
    clearTimeout(gameLoopTimeoutId.value);
    gameLoopTimeoutId.value = null;
  }

  snake.value = initializeSnake();
  food.value = generateRandomFood();
  direction.value = Direction.Right;
  pendingDirection.value = Direction.Right;
};

const startGame = async (): Promise<void> => {
  if (gameState.isPlaying) return;
  resetGame();
  gameState.isLoading = true;
  gameState.isGameOver = false;

  await new Promise((resolve) => setTimeout(resolve, LOADING_DURATION));

  gameState.isLoading = false;
  gameState.isPlaying = true;

  nextTick(() => {
    gameBoard.value?.focus();
  });

  gameLoop();
};

const endGame = (): void => {
  gameState.isPlaying = false;
  gameState.isGameOver = true;

  // Clear game loop
  if (gameLoopTimeoutId.value) {
    clearTimeout(gameLoopTimeoutId.value);
    gameLoopTimeoutId.value = null;
  }

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem("snakeHighScore", gameState.highScore.toString());
  }
};

const resetGame = (): void => {
  resetGameState();
};

// Core game loop with improved direction handling
const gameLoop = (): void => {
  if (!gameState.isPlaying) return;

  // Apply pending direction at the start of each game loop iteration
  direction.value = pendingDirection.value;

  const currentHead = snake.value[0];
  if (!currentHead) return;

  const newHead = getNextPosition(currentHead, direction.value);

  if (hasCollision(newHead)) {
    endGame();
    return;
  }

  snake.value.unshift(newHead);

  if (newHead.x === food.value.x && newHead.y === food.value.y) {
    gameState.score += 10;
    food.value = generateRandomFood();
  } else {
    snake.value.pop();
  }

  gameLoopTimeoutId.value = setTimeout(gameLoop, GAME_SPEED);
};

// Input handling with improved direction validation
const handleDirectionChange = (newDirection: Direction): void => {
  if (!gameState.isPlaying) return;

  const oppositeDirections: Record<Direction, Direction> = {
    [Direction.Up]: Direction.Down,
    [Direction.Down]: Direction.Up,
    [Direction.Left]: Direction.Right,
    [Direction.Right]: Direction.Left,
  };

  // Prevent opposite direction changes
  if (oppositeDirections[direction.value] === newDirection) return;

  // Store pending direction to apply on next game loop iteration
  pendingDirection.value = newDirection;
};

const handleKeyPress = (event: KeyboardEvent): void => {
  event.preventDefault();

  const keyDirectionMap: Record<string, Direction> = {
    KeyW: Direction.Up,
    KeyA: Direction.Left,
    KeyS: Direction.Down,
    KeyD: Direction.Right,
    ArrowUp: Direction.Up,
    ArrowLeft: Direction.Left,
    ArrowDown: Direction.Down,
    ArrowRight: Direction.Right,
  };

  const newDirection = keyDirectionMap[event.code];
  if (newDirection) {
    handleDirectionChange(newDirection);
  }
};

// Lifecycle hooks
onMounted(() => {
  resetGameState();
  const storedHighScore = localStorage.getItem("snakeHighScore");
  if (storedHighScore) {
    gameState.highScore = Number.parseInt(storedHighScore, 10);
  } else {
    gameState.highScore = 0;
  }

  if (gameBoard.value) {
    gameBoard.value.focus();
  }
});

onUnmounted(() => {
  gameState.isPlaying = false;
  if (gameLoopTimeoutId.value) {
    clearTimeout(gameLoopTimeoutId.value);
  }
});

// Component metadata
defineOptions({
  name: "SnakeGame90s",
});

// Export enums for template access
defineExpose({
  Direction,
  CellType,
});
</script>

<style lang="scss">
$app-desktop: 1384px;
$app-laptop: 960px;
$app-mobile: 600px;
$app-narrow-mobile: 364px;
$app-medium-height: 750px;
$app-small-height: 520px;

$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-xxl: 48px;

$font-family-mono: "Tektur", "Courier New", "Monaco", monospace;
$font-family-display: "Tektur", "Montserrat", sans-serif;

// Modern Soulful Snake Container
.snake-game {
  padding: $spacing-xl;
  font-family: $font-family-display;
  // Frosted Cyber-Glass background
  background: linear-gradient(145deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.4) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 32px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: var(--color-neutral-on-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-xxl;
  max-width: 100%;
  height: 100%;
  @media screen and (max-height: $app-medium-height) {
    .snake-game__board-container,
    .snake-game__virtual-controls {
      display: none;
    }
    @media screen and (min-width: $app-narrow-mobile) and (min-height: $app-small-height) {
      .snake-game__board {
        width: 350px;
        height: 350px;
      }
    }
    & {
      height: max-content;
    }
  }
  &--in-game {
    @media screen and (max-height: $app-medium-height) {
      .snake-game__controls,
      .snake-game__stats {
        display: none;
      }
      .snake-game__board-container,
      .snake-game__virtual-controls {
        display: flex;
      }
    }
  }
  &__container {
    max-width: 100%;
    height: 100%;
    justify-content: space-between;
    display: flex;
    flex-direction: column;
  }
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    gap: $spacing-md;
    margin-bottom: $spacing-lg;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    font-family: $font-family-display;
    color: var(--color-primary-on-text);
    text-shadow: 0 0 20px rgba(var(--color-primary-on-text), 0.4);
    margin: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  &__score {
    font-size: 1.5rem;
    font-family: $font-family-mono;
    font-weight: 700;
    color: var(--color-primary-on-text);
    background: rgba(0, 0, 0, 0.2);
    padding: $spacing-sm $spacing-lg;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-pill);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
    min-width: 100px;
    text-align: center;
    text-shadow: 0 0 10px rgba(var(--color-primary-on-text), 0.5);
  }

  // Controls section
  &__controls {
    text-align: center;
    margin-bottom: $spacing-lg;
  }

  &__instructions {
    margin: 0 0 $spacing-md 0;
    color: var(--color-neutral-on-muted);
    font-size: 0.875rem;
    font-family: $font-family-mono;
    text-transform: uppercase;
  }

  &__buttons {
    display: flex;
    gap: $spacing-md;
    justify-content: center;
    flex-wrap: wrap;
  }
  &__board-stats-controls-wrapper {
    display: flex;
    flex-direction: column;
    @media screen and (max-height: 932px) and (min-width: $app-laptop) {
      flex-direction: row;
      align-items: center;
      gap: 64px;
      .snake-game__board-container {
        margin-bottom: 0;
      }
    }
  }
  @media screen and (max-height: $app-medium-height) and (min-width: $app-mobile) and (max-width: 932px) {
    &__board-stats-controls-wrapper {
      flex-direction: row;
      gap: 24px;
      align-items: center;
    }
    & {
      padding: $spacing-md;
      border-radius: var(--radius-md);
    }
  }
  // Game board container
  &__board-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: $spacing-lg;
    flex: 1;
  }

  // Game Board - Frosted Glass & Dot Grid
  &__board {
    position: relative;
    width: 400px;
    height: 400px;
    background: rgba(10, 10, 15, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    overflow: hidden;
    outline: none;
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.4),
      inset 0 0 60px rgba(0, 0, 0, 0.2);

    &:focus {
      border-color: var(--color-primary-on-hover);
      box-shadow:
        0 0 0 2px rgba(var(--color-primary-on-hover), 0.3),
        0 10px 40px rgba(0, 0, 0, 0.4);
    }

    &--loading,
    &--game-over {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &--game-over {
      .snake-game__grid {
        opacity: 0.2;
        filter: blur(4px);
      }
    }
  }

  // Loading state - simple 90s style
  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-lg;
  }

  &__loading-dots {
    display: flex;
    gap: $spacing-sm;

    span {
      width: 12px;
      height: 12px;
      background: var(--color-primary-on-text);
      border-radius: 50%;
      animation: pulse-dot 1.2s ease-in-out infinite;
      box-shadow: 0 0 10px var(--color-primary-on-text);

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  &__loading-text {
    font-family: $font-family-mono;
    font-size: 0.875rem;
    color: var(--color-neutral-on-muted);
    text-transform: uppercase;
    margin: 0;
  }

  // Game Over Overlay
  &__game-over {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(5, 5, 10, 0.9);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: $spacing-xl $spacing-xxl;
    text-align: center;
    z-index: 10;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    min-width: 240px;
  }

  &__game-over-title {
    font-family: $font-family-mono;
    font-size: 1.5rem;
    color: var(--color-primary-on-text);
    margin: 0 0 $spacing-md 0;
    text-transform: uppercase;
  }

  &__game-over-score {
    font-family: $font-family-mono;
    font-size: 1rem;
    color: var(--color-neutral-on-text);
    margin: 0 0 $spacing-lg 0;
  }

  // Game Grid - Dot Pattern (Visible Grid)
  &__grid {
    display: grid;
    width: 100%;
    height: 100%;
    gap: 0;
    padding: 0;
    // Dot Grid Pattern
    background-image: radial-gradient(rgba(255, 255, 255, 0.1) 15%, transparent 16%);
    background-size: 20px 20px; // Matches cell size
    background-position: 0 0;
  }

  // Cell styling - Clean, distinct
  &__cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    &--empty {
      background: transparent;
    }

    &--snake {
      background: var(--color-primary-on-text);
      border-radius: 6px;
      transform: scale(0.9); // Distinct cells
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.3),
        0 0 4px rgba(var(--color-primary-on-text), 0.3);
    }

    &--snake-head {
      background: var(--color-primary-on-hover);
      border-radius: 8px;
      transform: scale(0.95);
      z-index: 2;
      box-shadow:
        0 0 15px var(--color-primary-on-text),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }

    &--food {
      position: relative;
      background: transparent;

      &::after {
        content: "";
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--blue-4);
        box-shadow:
          0 0 10px var(--blue-5),
          0 0 20px var(--blue-5);
        animation: neon-pulse 1.5s ease-in-out infinite;
      }
    }
  }

  // Snake eyes implementation for visual direction feedback
  &__snake-eyes {
    position: absolute;
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    gap: 2px;

    &--up {
      align-items: flex-start;
      padding-top: 2px;
    }

    &--down {
      align-items: flex-end;
      padding-bottom: 2px;
    }

    &--left {
      justify-content: flex-start;
      flex-direction: column;
      padding-left: 2px;
    }

    &--right {
      justify-content: flex-end;
      flex-direction: column;
      padding-right: 2px;
    }
  }

  &__eye {
    width: 3px;
    height: 3px;
    background: var(--color-bg-on-primary);
    border-radius: 50%;
    display: block;
  }

  // Virtual controls - Always visible
  &__virtual-controls {
    display: flex;
    justify-content: center;
  }

  &__dpad {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-xs;
  }

  &__dpad-middle {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  &__dpad-center {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  &__dpad-button {
    width: 48px;
    height: 48px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: var(--color-neutral-on-text);
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      5px 5px 10px rgba(0, 0, 0, 0.2),
      -2px -2px 6px rgba(255, 255, 255, 0.05);

    &:hover:not(:disabled) {
      color: var(--color-primary-on-text);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(1px);
      box-shadow:
        inset 2px 2px 5px rgba(0, 0, 0, 0.3),
        inset -2px -2px 5px rgba(255, 255, 255, 0.05);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      box-shadow: none;
    }
  }

  // Statistics section
  &__stats {
    display: flex;
    justify-content: space-between;
    gap: $spacing-lg;
    margin-top: $spacing-lg;
    padding-top: $spacing-md;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  &__stat {
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
    padding: $spacing-sm $spacing-lg;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    width: 152px;
    height: max-content;
  }

  &__stat-label {
    display: block;
    font-size: 0.7rem;
    color: var(--color-neutral-on-muted);
    margin-bottom: $spacing-xs;
    font-family: $font-family-display;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.8;
  }

  &__stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary-on-text);
    font-family: $font-family-mono;
    text-shadow: 0 0 10px rgba(var(--color-primary-on-text), 0.3);
  }
}

// Animations
@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
}

@keyframes neon-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 0 10px var(--blue-5),
      0 0 20px var(--blue-5);
  }
  50% {
    transform: scale(1.1);
    box-shadow:
      0 0 15px var(--blue-5),
      0 0 30px var(--blue-4);
  }
}

// Enhanced responsive design with better mobile viewport handling
@media (max-width: $app-mobile) {
  .snake-game {
    padding: $spacing-md;

    &__board {
      width: min(90vw, 350px);
      height: min(90vw, 350px);
    }

    &__header {
      margin-bottom: $spacing-lg;
    }

    &__controls {
      margin-bottom: $spacing-lg;
    }

    &__title {
      font-size: 1.5rem;
    }

    &__score {
      font-size: 1.25rem;
    }

    &__buttons {
    }

    &__button {
      width: 120px;
    }

    &__stats {
      margin-top: $spacing-lg;
    }

    &__stat {
      padding: $spacing-sm;
    }
    
    &__dpad-button,
    &__dpad-center {
      width: 48px;
      height: 48px;
      font-size: 1rem;
    }
  }
}
@media screen and (max-height: 932px) and (min-height: $app-medium-height) and (max-width: $app-laptop) {
  .snake-game {
    &__board {
      width: 350px;
      height: 350px;
    }
    &__controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    &__instructions {
      width: 220px;
      overflow-wrap: anywhere;
      margin-bottom: 0;
      text-wrap: balance;
    }
    &__stats-controls-wrapper {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      height: 100%;
    }
    &__stats {
      border-top: 0;
      gap: $spacing-md;
      flex-direction: column;
      margin-top: 0;
      padding-top: 0;
    }
    &__stat {
      width: 100%;
      padding: $spacing-sm;
      border-radius: var(--radius-sm);
    }
  }
}
@media (max-width: $app-narrow-mobile) or (max-height: $app-small-height) {
  .snake-game {
    padding: $spacing-sm;
    border-radius: var(--radius-sm);
    &__board {
      width: min(85vw, 280px);
      height: min(85vw, 280px);
    }

    &__title {
      font-size: 1.25rem;
    }

    &__score {
      font-size: 1rem;
      padding: $spacing-xs $spacing-sm;
    }

    &__button {
      width: 100px;
      padding: $spacing-sm $spacing-md;
      font-size: 0.75rem;
    }

    &__dpad-button,
    &__dpad-center {
      width: 30px;
      height: 30px;
      font-size: 0.875rem;
    }

    &__stat-value {
      font-size: 1rem;
    }

    &__stat-label {
      font-size: 0.625rem;
    }
  }
}

// Portrait orientation optimization for mobile devices
@media (max-width: $app-mobile) and (orientation: portrait) and (max-height: 800px) {
  .snake-game {
    &__header {
      margin-bottom: $spacing-md;
    }

    &__controls {
      margin-bottom: $spacing-md;
    }

    &__board-container {
      margin-bottom: $spacing-md;
    }

    &__virtual-controls {
      margin-top: $spacing-sm;
    }

    &__stats {
      margin-top: $spacing-md;
      padding-top: $spacing-sm;
    }
  }
}

// Landscape orientation optimization for mobile devices
@media (max-width: $app-mobile) and (orientation: landscape) and (max-height: 500px) {
  .snake-game {
    padding: $spacing-sm;
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: auto auto 1fr auto;
    grid-template-areas:
      "header header header"
      "controls controls controls"
      "board board board"
      "stats stats stats";
    gap: $spacing-sm;

    &__header {
      grid-area: header;
      margin-bottom: 0;
    }

    &__controls {
      grid-area: controls;
      margin-bottom: 0;
    }

    &__board-container {
      grid-area: board;
      margin-bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    &__board {
      width: min(70vh, 300px);
      height: min(70vh, 300px);
    }

    &__virtual-controls {
      position: fixed;
      bottom: $spacing-sm;
      right: $spacing-sm;
      margin-top: 0;
      z-index: 5;
    }

    &__stats {
      grid-area: stats;
      margin-top: 0;
      flex-direction: row;
      justify-content: space-around;
    }

    &__dpad {
      transform: scale(0.8);
    }
  }
}

// High DPI display support
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .snake-game {
    &__eye {
      width: 4px;
      height: 4px;
    }
  }
}

// Reduced motion support
@media (prefers-reduced-motion: reduce) {
  .snake-game {
    &__loading-dots span {
      animation: none;
    }

    &__button,
    &__dpad-button {
      transition: none;
    }
  }
}

// Dark mode enhancement for better contrast
@media (prefers-color-scheme: dark) {
  .snake-game {
    &__eye {
      background: var(--color-neutral-on-text);
    }
  }
}
</style>
