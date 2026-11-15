import { PIN_LENGTH } from "./constants";

export const SCAN_COPY = {
  title: "Приложите NFC-бейдж к счётчику метки",
  subtitle: "Possession factor · offline credential registry · zero cloud storage",
  gateTag: "Mission Access Gate",
  cancel: "Отмена",
  helloButton: "Windows Hello / WebAuthn",
  helloBusy: "Проверка Windows Hello...",
  helloConfirmed: "Windows Hello подтверждён. Выберите демонстрационный бейдж ниже.",
  demoBadges: "Demo crew badges",
  newBadge: "Simulate New Unregistered Badge",
} as const;

export const PIN_COPY = {
  title: `Введите ${PIN_LENGTH}-значный PIN-код`,
  back: "Другой бейдж",
  invalidPin: "Неверный PIN-код. Попробуйте снова.",
  verifyFailed: "Не удалось проверить PIN-код. Приложите бейдж заново.",
  lengthError: `PIN-код должен состоять из ${PIN_LENGTH} цифр.`,
  lockout: (seconds: number): string =>
    `Слишком много неверных попыток. Повторите через ${seconds} сек.`,
} as const;

export const ENROLLMENT_COPY = {
  createPrompt: "Новый бейдж распознан. Придумайте PIN-код",
  confirmPrompt: "Повторите PIN-код",
  mismatch: "PIN-коды не совпадают. Попробуйте снова",
  failed: "Не удалось создать профиль. Попробуйте снова.",
  displayNameLabel: "Display name (optional)",
  displayNamePlaceholder: "e.g. Cmdr. Nova Reyes",
  roleLabel: "Crew role",
  continueButton: "Продолжить",
  creatingButton: "Создание профиля...",
  createButton: "Создать аккаунт",
} as const;

export const SESSION_COPY = {
  question: "Запомнить сессию?",
  ephemeral: "Нет, по окончании работы выйти из аккаунта",
  persistent: "Да, не выходить из аккаунта",
  ephemeralHint: "5-minute inactivity auto-lock",
  persistentHint: "Persistent until manual logout",
  ephemeralSubtitle: (displayName: string): string =>
    `${displayName} · эфемерный режим блокируется через 5 минут бездействия.`,
} as const;

export const HEADER_COPY = {
  savedProfiles: "Saved profiles",
  addAccount: "Добавить аккаунт",
  logout: "Выйти из аккаунта",
} as const;
