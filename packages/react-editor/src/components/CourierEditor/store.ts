import { atom } from 'jotai';

export const pageAtom = atom<'template' | 'theme'>('template');
export const subjectAtom = atom<string>(''); 