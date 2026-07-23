interface ExperienceRank {
  min: number;
  label: string;
}

// Відсортовано за спаданням `min` - перший ранг, де experience >= min, і відповідь.
const EXPERIENCE_RANKS: ExperienceRank[] = [
  { min: 200, label: 'Легенда активності 👑' },
  { min: 100, label: 'Ветеран 🎖️' },
  { min: 50, label: 'Досвідчений 💪' },
  { min: 20, label: 'Спостерігач 🔍' },
  { min: 0, label: 'Новачок 🌱' },
];

export function getExperienceRankLabel(experience: number): string {
  return (EXPERIENCE_RANKS.find((rank) => experience >= rank.min) ?? EXPERIENCE_RANKS[EXPERIENCE_RANKS.length - 1])
    .label;
}
