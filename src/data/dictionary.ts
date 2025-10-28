import { getReferenceDate } from "../utils/referenceDate";
// Load 5_words.txt and 5_answers.txt into memory
import wordsRaw from "./5_words.txt?raw";
import answersRaw from "./5_answers.txt?raw";

const parseWordList = (raw: string): string[] =>
  raw
    .split("\n")
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean);

const VALID_GUESSES = parseWordList(wordsRaw);
const POSSIBLE_SOLUTIONS = parseWordList(answersRaw);

const ALL_WORDS = new Set<string>([...VALID_GUESSES, ...POSSIBLE_SOLUTIONS]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RNG_MULTIPLIER = 1664525;
const RNG_INCREMENT = 1013904223;

const lcg = (seed: number): number =>
  (Math.imul(RNG_MULTIPLIER, seed >>> 0) + RNG_INCREMENT) >>> 0;

export const getPuzzleDay = (date: Date = getReferenceDate()): number => {
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.floor(utcMidnight / MS_PER_DAY);
};

const getSolutionIndexForDay = (dayNumber: number): number => {
  if (POSSIBLE_SOLUTIONS.length === 0) {
    return 0;
  }
  const randomValue = lcg(dayNumber);
  return randomValue % POSSIBLE_SOLUTIONS.length;
};

export const pickRandomSolution = (
  referenceDate: Date = getReferenceDate(),
): string => {
  if (POSSIBLE_SOLUTIONS.length === 0) {
    throw new Error("No possible solutions available.");
  }

  const todayNumber = getPuzzleDay(referenceDate);
  const yesterdayNumber = todayNumber - 1;

  let todayIndex = getSolutionIndexForDay(todayNumber);
  const yesterdayIndex = getSolutionIndexForDay(yesterdayNumber);

  if (POSSIBLE_SOLUTIONS.length > 1 && todayIndex === yesterdayIndex) {
    todayIndex = (todayIndex + 1) % POSSIBLE_SOLUTIONS.length;
  }

  return POSSIBLE_SOLUTIONS[todayIndex];
};

export const isValidGuess = (candidate: string): boolean =>
  ALL_WORDS.has(candidate.toUpperCase());
