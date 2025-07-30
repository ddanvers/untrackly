<template>
  <div class="snake-game">
    <div class="snake-game__header">
      <h1 class="snake-game__title">Змейка</h1>
      <div class="snake-game__score">Счёт: {{ gameState.score }}</div>
    </div>

    <div class="snake-game__controls">
      <p class="snake-game__instructions">Управление: WASD или стрелочки</p>
      <button
        class="snake-game__button snake-game__button--primary"
        @click="startGame"
        :disabled="gameState.isPlaying"
      >
        {{ gameState.isPlaying ? "Игра идёт" : "Начать игру" }}
      </button>
      <button class="snake-game__button snake-game__button--secondary" @click="resetGame">
        Сброс
      </button>
    </div>

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
        <!-- Loading state with square style -->
        <div v-if="gameState.isLoading" class="snake-game__loading">
          <div class="snake-game__loading-square"></div>
          <p class="snake-game__loading-text">Загрузка...</p>
        </div>

        <!-- Game Over overlay -->
        <div v-if="gameState.isGameOver && !gameState.isLoading" class="snake-game__game-over">
          <h2 class="snake-game__game-over-title">Игра окончена!</h2>
          <p class="snake-game__game-over-score">Финальный счёт: {{ gameState.score }}</p>
          <button class="snake-game__button snake-game__button--primary" @click="resetGame">
            Играть снова
          </button>
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
          ></div>
        </div>
      </div>
    </div>

    <div class="snake-game__stats">
      <div class="snake-game__stat">
        <span class="snake-game__stat-label">Длина:</span>
        <span class="snake-game__stat-value">{{ snake.length }}</span>
      </div>
      <div class="snake-game__stat">
        <span class="snake-game__stat-label">Лучший результат:</span>
        <span class="snake-game__stat-value">{{ gameState.highScore }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Core composition API imports - explicit and organized
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

// Constants following clean code principles - meaningful names and single responsibility
const BOARD_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;
const GAME_SPEED = 150; // milliseconds
const LOADING_DURATION = 1500; // milliseconds

// Reactive state management - centralized and typed
const gameState = reactive<GameState>({
  isPlaying: false,
  isGameOver: false,
  isLoading: false,
  score: 0,
  highScore: 0,
});

const snake = ref<Position[]>([]);
const food = ref<Position>({ x: 0, y: 0 });
const direction = ref<Direction>(Direction.Right);
const gameBoard = ref<HTMLElement>();

// Computed properties for derived state - following single responsibility principle
const gameGrid = computed<CellType[]>(() => {
  const grid = Array(BOARD_SIZE * BOARD_SIZE).fill(CellType.Empty);

  // Mark snake body cells
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

// Game logic functions - pure functions following clean code principles
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

  // Self collision
  return snake.value.some(
    (segment) => segment.x === head.x && segment.y === head.y,
  );
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

// Game state management - following command pattern
const resetGameState = (): void => {
  gameState.isPlaying = false;
  gameState.isGameOver = false;
  gameState.isLoading = false;
  gameState.score = 0;

  snake.value = initializeSnake();
  food.value = generateRandomFood();
  direction.value = Direction.Right;
};

const startGame = async (): Promise<void> => {
  if (gameState.isPlaying) return;

  gameState.isLoading = true;
  gameState.isGameOver = false;

  // Simulate loading with square animation
  await new Promise((resolve) => setTimeout(resolve, LOADING_DURATION));

  gameState.isLoading = false;
  gameState.isPlaying = true;

  // Focus the game board for keyboard events
  nextTick(() => {
    gameBoard.value?.focus();
  });

  gameLoop();
};

const endGame = (): void => {
  gameState.isPlaying = false;
  gameState.isGameOver = true;

  // Update high score if needed
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    // Persist high score (could be localStorage in real implementation)
  }
};

const resetGame = (): void => {
  resetGameState();
};

// Core game mechanics - main game loop following clean architecture
const gameLoop = (): void => {
  if (!gameState.isPlaying) return;

  const currentHead = snake.value[0];
  const newHead = getNextPosition(currentHead, direction.value);

  // Check for collisions
  if (hasCollision(newHead)) {
    endGame();
    return;
  }

  // Move snake
  snake.value.unshift(newHead);

  // Check if food was eaten
  if (newHead.x === food.value.x && newHead.y === food.value.y) {
    gameState.score += 10;
    food.value = generateRandomFood();
  } else {
    // Remove tail if no food eaten
    snake.value.pop();
  }

  // Continue game loop
  setTimeout(gameLoop, GAME_SPEED);
};

// Input handling - following strategy pattern for different input methods
const handleDirectionChange = (newDirection: Direction): void => {
  if (!gameState.isPlaying) return;

  // Prevent reverse direction
  const oppositeDirections: Record<Direction, Direction> = {
    [Direction.Up]: Direction.Down,
    [Direction.Down]: Direction.Up,
    [Direction.Left]: Direction.Right,
    [Direction.Right]: Direction.Left,
  };

  if (oppositeDirections[direction.value] === newDirection) return;

  direction.value = newDirection;
};

const handleKeyPress = (event: KeyboardEvent): void => {
  event.preventDefault();

  const keyDirectionMap: Record<string, Direction> = {
    // WASD controls
    KeyW: Direction.Up,
    KeyA: Direction.Left,
    KeyS: Direction.Down,
    KeyD: Direction.Right,
    // Arrow keys
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

// Lifecycle management - proper cleanup and initialization
onMounted(() => {
  resetGameState();

  // Load high score from storage (placeholder for real implementation)
  gameState.highScore = 0;
});

onUnmounted(() => {
  gameState.isPlaying = false;
});

// Component metadata for Nuxt3
defineOptions({
  name: "SnakeGame",
});
</script>

<style lang="scss">
// Design system tokens aligned with untrackly cyberpunk aesthetic
$untrackly-primary: #ffa500; // Orange accent from design system
$untrackly-secondary: #ff8c00; // Darker orange for hover states
$untrackly-accent: #ffd700; // Gold for highlights
$untrackly-danger: #ff4444; // Red for game over states
$untrackly-bg-primary: #0a0a0f; // Deep dark background
$untrackly-bg-secondary: #1a1a2e; // Slightly lighter dark
$untrackly-bg-surface: #16213e; // Surface elements
$untrackly-border: #2a2a40; // Subtle borders
$untrackly-text-primary: #ffffff; // Primary text
$untrackly-text-secondary: #b0b0b0; // Secondary text
$untrackly-text-muted: #808080; // Muted text

// Component design tokens for architectural coherence
$untrackly-spacing-xs: 0.25rem;
$untrackly-spacing-sm: 0.5rem;
$untrackly-spacing-md: 1rem;
$untrackly-spacing-lg: 1.5rem;
$untrackly-spacing-xl: 2rem;
$untrackly-spacing-xxl: 3rem;

$untrackly-border-radius-sm: 4px;
$untrackly-border-radius-md: 8px;
$untrackly-border-radius-lg: 12px;

$untrackly-transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
$untrackly-transition-base: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
$untrackly-transition-slow: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

// Typography scale following modular scale principles
$untrackly-font-family:
  "Inter",
  "SF Pro Display",
  -apple-system,
  BlinkMacSystemFont,
  sans-serif;
$untrackly-font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;
$untrackly-font-size-xs: 0.75rem;
$untrackly-font-size-sm: 0.875rem;
$untrackly-font-size-base: 1rem;
$untrackly-font-size-lg: 1.125rem;
$untrackly-font-size-xl: 1.25rem;
$untrackly-font-size-2xl: 1.5rem;
$untrackly-font-size-3xl: 2rem;

// Main component architecture aligned with untrackly design system
.snake-game {
  max-width: 800px;
  margin: 0 auto;
  padding: $untrackly-spacing-xxl;
  font-family: $untrackly-font-family;
  background: linear-gradient(135deg, $untrackly-bg-primary 0%, $untrackly-bg-secondary 100%);
  border-radius: $untrackly-border-radius-lg;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid $untrackly-border;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, $untrackly-primary 50%, transparent 100%);
    opacity: 0.6;
  }

  // Enhanced header with cyberpunk aesthetic
  &__header {
    text-align: center;
    margin-bottom: $untrackly-spacing-xl;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: $untrackly-spacing-lg;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -#{$untrackly-spacing-md};
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, $untrackly-primary 50%, transparent 100%);
    }
  }

  &__title {
    font-size: $untrackly-font-size-3xl;
    color: $untrackly-text-primary;
    margin: 0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-shadow: 0 0 20px rgba(255, 165, 0, 0.3);
    position: relative;

    &::before {
      content: "▸";
      color: $untrackly-primary;
      margin-right: $untrackly-spacing-sm;
      font-size: $untrackly-font-size-xl;
    }
  }

  &__score {
    font-size: $untrackly-font-size-lg;
    font-weight: 600;
    color: $untrackly-text-primary;
    background: $untrackly-bg-surface;
    padding: $untrackly-spacing-md $untrackly-spacing-lg;
    border-radius: $untrackly-border-radius-md;
    border: 1px solid $untrackly-border;
    font-family: $untrackly-font-mono;
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: $untrackly-primary;
      opacity: 0.5;
    }
  }

  // Controls section with enhanced cyberpunk UI patterns
  &__controls {
    text-align: center;
    margin-bottom: $untrackly-spacing-xl;
    padding: $untrackly-spacing-lg;
    background: rgba($untrackly-bg-surface, 0.3);
    border-radius: $untrackly-border-radius-md;
    border: 1px solid $untrackly-border;
    backdrop-filter: blur(10px);
  }

  &__instructions {
    margin: 0 0 $untrackly-spacing-lg 0;
    color: $untrackly-text-secondary;
    font-size: $untrackly-font-size-sm;
    font-family: $untrackly-font-mono;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }

  // Enhanced button system following design system patterns
  &__button {
    padding: $untrackly-spacing-md $untrackly-spacing-xl;
    margin: 0 $untrackly-spacing-sm;
    border: none;
    border-radius: $untrackly-border-radius-sm;
    font-size: $untrackly-font-size-base;
    font-weight: 600;
    font-family: $untrackly-font-mono;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: $untrackly-transition-base;
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
      );
      transition: $untrackly-transition-base;
    }

    &:hover::before {
      left: 100%;
    }

    &--primary {
      background: linear-gradient(135deg, $untrackly-primary 0%, $untrackly-secondary 100%);
      color: $untrackly-bg-primary;
      border: 1px solid $untrackly-primary;
      box-shadow: 0 0 20px rgba($untrackly-primary, 0.3);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, $untrackly-secondary 0%, $untrackly-primary 100%);
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba($untrackly-primary, 0.5);
      }

      &:disabled {
        background: $untrackly-text-muted;
        cursor: not-allowed;
        opacity: 0.4;
        box-shadow: none;

        &::before {
          display: none;
        }
      }
    }

    &--secondary {
      background: transparent;
      color: $untrackly-primary;
      border: 1px solid $untrackly-primary;

      &:hover {
        background: rgba($untrackly-primary, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 0 20px rgba($untrackly-primary, 0.2);
      }
    }
  }

  // Enhanced game board container with glassmorphism effects
  &__board-container {
    display: flex;
    justify-content: center;
    margin-bottom: $untrackly-spacing-xl;
    perspective: 1000px;
  }

  &__board {
    position: relative;
    width: 480px;
    height: 480px;
    background: rgba($untrackly-bg-surface, 0.4);
    border: 2px solid $untrackly-border;
    border-radius: $untrackly-border-radius-lg;
    outline: none;
    backdrop-filter: blur(20px);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: $untrackly-transition-base;

    &:focus {
      border-color: $untrackly-primary;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 0 0 2px rgba($untrackly-primary, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    // Enhanced board state modifiers with smooth transitions
    &--loading {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      background: rgba($untrackly-bg-surface, 0.6);
    }

    &--game-over {
      .snake-game__grid {
        opacity: 0.3;
        filter: grayscale(70%) blur(1px);
        transition: $untrackly-transition-slow;
      }
    }
  }

  // Refined loading state with geometric animation
  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $untrackly-spacing-lg;
  }

  &__loading-square {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, $untrackly-primary 0%, $untrackly-accent 100%);
    border-radius: $untrackly-border-radius-sm;
    position: relative;
    animation: untrackly-loading-morph 2s ease-in-out infinite;

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      background: $untrackly-bg-primary;
      border-radius: 2px;
      transform: translate(-50%, -50%);
      animation: untrackly-loading-inner 2s ease-in-out infinite reverse;
    }

    @keyframes untrackly-loading-morph {
      0%,
      100% {
        transform: scale(1) rotate(0deg);
        border-radius: $untrackly-border-radius-sm;
      }
      25% {
        transform: scale(1.1) rotate(90deg);
        border-radius: 50%;
      }
      50% {
        transform: scale(0.9) rotate(180deg);
        border-radius: $untrackly-border-radius-sm;
      }
      75% {
        transform: scale(1.1) rotate(270deg);
        border-radius: 50%;
      }
    }

    @keyframes untrackly-loading-inner {
      0%,
      100% {
        transform: translate(-50%, -50%) scale(1);
      }
      50% {
        transform: translate(-50%, -50%) scale(0.5);
      }
    }
  }

  &__loading-text {
    color: $untrackly-text-secondary;
    font-size: $untrackly-font-size-base;
    font-family: $untrackly-font-mono;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0;
    animation: untrackly-text-pulse 2s ease-in-out infinite;

    @keyframes untrackly-text-pulse {
      0%,
      100% {
        opacity: 0.6;
      }
      50% {
        opacity: 1;
      }
    }
  }

  // Enhanced game over overlay with refined cyberpunk aesthetics
  &__game-over {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba($untrackly-bg-surface, 0.95);
    backdrop-filter: blur(20px);
    padding: $untrackly-spacing-xxl;
    border-radius: $untrackly-border-radius-lg;
    text-align: center;
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border: 1px solid $untrackly-border;
    z-index: 10;
    animation: untrackly-game-over-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

    @keyframes untrackly-game-over-appear {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
  }

  &__game-over-title {
    color: $untrackly-danger;
    margin: 0 0 $untrackly-spacing-lg 0;
    font-size: $untrackly-font-size-2xl;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: $untrackly-font-mono;
    text-shadow: 0 0 20px rgba($untrackly-danger, 0.3);
  }

  &__game-over-score {
    margin: 0 0 $untrackly-spacing-xl 0;
    font-size: $untrackly-font-size-lg;
    color: $untrackly-text-primary;
    font-family: $untrackly-font-mono;
    font-weight: 600;
  }

  // Enhanced game grid with performance-optimized CSS Grid implementation
  &__grid {
    display: grid;
    width: 100%;
    height: 100%;
    gap: 1px;
    background: linear-gradient(135deg, $untrackly-border 0%, darken($untrackly-border, 10%) 100%);
    padding: 3px;
    border-radius: $untrackly-border-radius-sm;
    will-change: transform;
  }

  // Refined cell styling with enhanced visual hierarchy
  &__cell {
    background: $untrackly-bg-surface;
    transition: $untrackly-transition-fast;
    border-radius: 2px;
    position: relative;
    will-change: background-color, transform;

    &--empty {
      background: $untrackly-bg-surface;
      opacity: 0.6;

      &:hover {
        opacity: 0.8;
      }
    }

    &--snake {
      background: linear-gradient(
        135deg,
        $untrackly-primary 0%,
        darken($untrackly-primary, 15%) 100%
      );
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transform: scale(0.95);

      &::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        right: 2px;
        height: 1px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 1px;
      }
    }

    &--snake-head {
      background: linear-gradient(135deg, $untrackly-accent 0%, $untrackly-primary 100%);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        0 0 10px rgba($untrackly-accent, 0.4);
      transform: scale(1);
      border-radius: 3px;
      position: relative;
      animation: untrackly-snake-head-pulse 1s ease-in-out infinite;

      @keyframes untrackly-snake-head-pulse {
        0%,
        100% {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 0 10px rgba($untrackly-accent, 0.4);
        }
        50% {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 0 20px rgba($untrackly-accent, 0.6);
        }
      }

      // Enhanced snake head eyes with geometric precision
      &::before,
      &::after {
        content: "";
        position: absolute;
        width: 3px;
        height: 3px;
        background: $untrackly-bg-primary;
        border-radius: 50%;
        top: 4px;
        box-shadow: 0 0 2px rgba($untrackly-bg-primary, 0.8);
      }

      &::before {
        left: 4px;
      }
      &::after {
        right: 4px;
      }
    }

    &--food {
      background: radial-gradient(
        circle,
        $untrackly-danger 0%,
        darken($untrackly-danger, 20%) 100%
      );
      border-radius: 50%;
      transform: scale(0.8);
      box-shadow:
        0 0 15px rgba($untrackly-danger, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      animation: untrackly-food-beacon 2s ease-in-out infinite;
      position: relative;

      &::before {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 50%;
      }

      @keyframes untrackly-food-beacon {
        0%,
        100% {
          transform: scale(0.8);
          box-shadow: 0 0 15px rgba($untrackly-danger, 0.5);
        }
        50% {
          transform: scale(0.9);
          box-shadow: 0 0 25px rgba($untrackly-danger, 0.8);
        }
      }
    }
  }

  // Enhanced statistics section with cyberpunk data visualization
  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: $untrackly-spacing-lg;
    margin-top: $untrackly-spacing-xl;
  }

  &__stat {
    text-align: center;
    background: rgba($untrackly-bg-surface, 0.4);
    backdrop-filter: blur(10px);
    padding: $untrackly-spacing-lg;
    border-radius: $untrackly-border-radius-md;
    border: 1px solid $untrackly-border;
    position: relative;
    overflow: hidden;
    transition: $untrackly-transition-base;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(
        90deg,
        $untrackly-primary 0%,
        $untrackly-accent 50%,
        $untrackly-primary 100%
      );
      opacity: 0.6;
    }

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, $untrackly-primary 50%, transparent 100%);
      opacity: 0.3;
    }

    &:hover {
      transform: translateY(-2px);
      border-color: $untrackly-primary;
      box-shadow: 0 8px 25px rgba($untrackly-primary, 0.15);

      &::before {
        opacity: 1;
      }
    }
  }

  &__stat-label {
    display: block;
    font-size: $untrackly-font-size-xs;
    color: $untrackly-text-secondary;
    margin-bottom: $untrackly-spacing-sm;
    font-family: $untrackly-font-mono;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 500;
  }

  &__stat-value {
    display: block;
    font-size: $untrackly-font-size-2xl;
    font-weight: 700;
    color: $untrackly-primary;
    font-family: $untrackly-font-mono;
    text-shadow: 0 0 10px rgba($untrackly-primary, 0.3);
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 2px;
      background: $untrackly-primary;
      border-radius: 1px;
      opacity: 0.5;
    }
  }
}

// Enhanced responsive design with cyberpunk aesthetics preservation
@media (max-width: 768px) {
  .snake-game {
    padding: $untrackly-spacing-lg;
    margin: $untrackly-spacing-md;

    &__board {
      width: 360px;
      height: 360px;
    }

    &__header {
      flex-direction: column;
      gap: $untrackly-spacing-md;
      text-align: center;
    }

    &__title {
      font-size: $untrackly-font-size-2xl;
    }

    &__controls {
      padding: $untrackly-spacing-md;
    }

    &__button {
      padding: $untrackly-spacing-sm $untrackly-spacing-lg;
      font-size: $untrackly-font-size-sm;
      margin: $untrackly-spacing-xs;

      &:hover {
        transform: none;
      }
    }

    &__stats {
      grid-template-columns: 1fr;
      gap: $untrackly-spacing-md;
    }

    &__game-over {
      padding: $untrackly-spacing-lg;
      margin: $untrackly-spacing-md;
    }
  }
}

@media (max-width: 480px) {
  .snake-game {
    padding: $untrackly-spacing-md;

    &__board {
      width: 280px;
      height: 280px;
    }

    &__title {
      font-size: $untrackly-font-size-xl;
    }

    &__score {
      font-size: $untrackly-font-size-base;
      padding: $untrackly-spacing-sm $untrackly-spacing-md;
    }

    &__button {
      display: block;
      width: 100%;
      margin: $untrackly-spacing-xs 0;
    }
  }
}

// Enhanced accessibility support with design system compliance
@media (prefers-contrast: high) {
  .snake-game {
    &__cell {
      &--snake {
        border: 2px solid $untrackly-text-primary;
      }

      &--snake-head {
        border: 2px solid $untrackly-accent;
      }

      &--food {
        border: 2px solid $untrackly-danger;
      }
    }

    &__button--primary {
      border: 2px solid $untrackly-text-primary;
    }
  }
}

// Refined reduced motion support maintaining cyberpunk aesthetic
@media (prefers-reduced-motion: reduce) {
  .snake-game {
    &__loading-square,
    &__cell--food,
    &__cell--snake-head {
      animation: none;
    }

    &__button,
    &__stat,
    &__board {
      transition: none;

      &:hover {
        transform: none;
      }
    }

    &__game-over {
      animation: none;
    }
  }
}

// Dark mode optimization (already inherently dark, but enhanced for OLED)
@media (prefers-color-scheme: dark) {
  .snake-game {
    background: linear-gradient(
      135deg,
      darken($untrackly-bg-primary, 5%) 0%,
      darken($untrackly-bg-secondary, 5%) 100%
    );

    &__board {
      background: rgba(darken($untrackly-bg-surface, 10%), 0.4);
    }

    &__cell--empty {
      background: darken($untrackly-bg-surface, 15%);
      opacity: 0.4;
    }
  }
}

// High performance mode for low-end devices
@media (max-resolution: 150dpi) {
  .snake-game {
    &__board {
      backdrop-filter: none;
    }

    &__controls,
    &__stat,
    &__game-over {
      backdrop-filter: none;
      background: $untrackly-bg-surface;
    }

    &__cell--snake-head,
    &__cell--food {
      animation: none;
    }
  }
}
</style>
