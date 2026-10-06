import { BloopEvent, Relation, Tone } from '../types';
import { ordinal } from './dates';

export interface Wish {
  id: string;
  text: string;
  premium: boolean;
}

export const TONES: Array<{ id: Tone; label: string; emoji: string }> = [
  { id: 'sweet', label: 'Sweet', emoji: '💛' },
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'short', label: 'Short', emoji: '⚡' },
  { id: 'hype', label: 'Hype', emoji: '🔥' },
  { id: 'formal', label: 'Formal', emoji: '🎩' },
];

type Template = (n: string, age?: number) => string;

const BASE: Record<Tone, Template[]> = {
  sweet: [
    n => `Happy birthday, ${n}! Hope today feels as warm as you make everyone around you feel. 💛`,
    n => `${n}, you make the world a little brighter just by being in it. Have the best day!`,
    (n, a) => `Happy ${a ? ordinal(a) + ' ' : ''}birthday ${n}! So glad you exist. Today is all yours. 🎂`,
  ],
  funny: [
    n => `Happy birthday ${n}! You're not getting older, you're just leveling up. Loading... 98%. 😂`,
    n => `${n}, another year, same great questionable decisions. Happy birthday! 🎉`,
    (n, a) => `${a ? `${a}? ` : ''}Wow ${n}, that's a lot of candles. Fire department's on standby. Happy birthday! 🔥`,
  ],
  short: [
    n => `Happy birthday, ${n}! 🎂`,
    n => `${n}! Happy birthday. Go celebrate. 🎉`,
    n => `Many happy returns, ${n} ✨`,
  ],
  hype: [
    n => `IT'S YOUR DAY, ${n.toUpperCase()}! 🎉🎉 Make it loud, make it legendary!`,
    n => `Happy birthday ${n}!!! Cake, chaos and zero responsibilities today. Let's go! 🥳`,
    n => `${n}, the main character has entered the chat. HAPPY BIRTHDAY! 🔥`,
  ],
  formal: [
    n => `Wishing you a very happy birthday, ${n}. May the year ahead bring you health and success.`,
    n => `Happy birthday, ${n}. Warm wishes for a wonderful day and a prosperous year.`,
    n => `Many happy returns of the day, ${n}. Best wishes for the year ahead.`,
  ],
};

const BY_RELATION: Partial<Record<Relation, Partial<Record<Tone, Template[]>>>> = {
  partner: {
    sweet: [n => `Happy birthday, my favourite person. ${n}, every day with you is a gift, today I get to celebrate you. ❤️`],
    funny: [n => `Happy birthday ${n}! I'd share my fries with you, and that's real love. 🍟❤️`],
  },
  family: {
    sweet: [n => `Happy birthday ${n}! Family is lucky to have you. Love you loads. 🤗`],
    funny: [n => `Happy birthday ${n}! You're officially the favourite one in the family today. (Don't tell the others.) 😄`],
  },
  work: {
    formal: [n => `Happy birthday, ${n}! Thanks for being a great colleague. Enjoy your day!`],
    short: [n => `Happy birthday ${n}! Enjoy the day off the to-do list. 🎂`],
  },
  friend: {
    funny: [n => `Happy birthday ${n}! Friends like you are why my phone gallery is full of questionable photos. 📸😂`],
    hype: [n => `${n}!!! Birthday plans are officially YOUR problem and MY pleasure. 🥳`],
  },
};

const PREMIUM: Record<Tone, Template[]> = {
  sweet: [
    n => `${n}, may this year hand you everything you quietly wished for. You deserve every bit of it. Happy birthday. 🌿`,
    n => `Some people make life softer. You're one of them, ${n}. Happy birthday, and thank you for being you.`,
  ],
  funny: [
    n => `Happy birthday ${n}! Remember: age is just a number, and yours is unfortunately getting bigger. 😂 Love you!`,
    n => `${n}, you're like a fine wine: you've got a few years on you and you're still giving me a headache. Cheers! 🍷`,
  ],
  short: [
    n => `${n}. Birthday. Cake. Go. 🍰`,
    n => `Cheers to you, ${n}! 🥂`,
  ],
  hype: [
    n => `${n.toUpperCase()}!!! ANOTHER LAP AROUND THE SUN, AND YOU'RE STILL THE BEST ONE ON THE TRACK! 🚀🎂`,
    n => `Level ${n} unlocked: new year, new power-ups. Happy birthday champ! 🎮🔥`,
  ],
  formal: [
    n => `On the occasion of your birthday, ${n}, I extend my sincere wishes for good health, happiness and continued success.`,
    n => `Dear ${n}, wishing you joy today and fulfilment throughout the year ahead. Happy birthday.`,
  ],
};

function anniversaryWish(e: BloopEvent, tone: Tone): string[] {
  const n = e.name;
  const map: Record<Tone, string[]> = {
    sweet: [`Happy anniversary, ${n}! Wishing you a year as lovely as the last. 💛`],
    funny: [`Happy anniversary ${n}! Still tolerating each other? That's the real achievement. 😂`],
    short: [`Happy anniversary, ${n}! 💐`],
    hype: [`HAPPY ANNIVERSARY ${n.toUpperCase()}! 🥂 Another year of being iconic together!`],
    formal: [`Wishing you a very happy anniversary, ${n}. May the years ahead be filled with happiness.`],
  };
  return map[tone];
}

function customWish(e: BloopEvent, tone: Tone): string[] {
  const n = e.name;
  const t = e.title?.trim() || 'special day';
  const map: Record<Tone, string[]> = {
    sweet: [`Thinking of you today, ${n}. Happy ${t}! 💛`],
    funny: [`Happy ${t}, ${n}! Make it a good one, or at least a memorable one. 😄`],
    short: [`Happy ${t}, ${n}! ✨`],
    hype: [`HAPPY ${t.toUpperCase()}, ${n.toUpperCase()}! Let's gooo! 🎉`],
    formal: [`Warm wishes to you on your ${t}, ${n}.`],
  };
  return map[tone];
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

/**
 * Wish suggestions for one person. Relation-specific lines come first, then
 * the general ones, then the premium pack (unlocked by a rewarded video).
 */
export function suggestWishes(event: BloopEvent, tone: Tone, age?: number): Wish[] {
  const n = firstName(event.name);
  if (event.kind === 'anniversary') {
    return anniversaryWish(event, tone).map((text, i) => ({ id: `a-${tone}-${i}`, text, premium: false }));
  }
  if (event.kind === 'custom') {
    return customWish(event, tone).map((text, i) => ({ id: `c-${tone}-${i}`, text, premium: false }));
  }
  const specific = BY_RELATION[event.relation]?.[tone] ?? [];
  const free = [...specific, ...BASE[tone]].map((t, i) => ({
    id: `f-${event.relation}-${tone}-${i}`,
    text: t(n, age),
    premium: false,
  }));
  const premium = PREMIUM[tone].map((t, i) => ({
    id: `p-${tone}-${i}`,
    text: t(n, age),
    premium: true,
  }));
  return [...free, ...premium];
}
