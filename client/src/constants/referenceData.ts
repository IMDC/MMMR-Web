// Reference data — ported from mobile videoReferenceData.ts
// BSON ObjectIDs replaced with plain string IDs

import { ReferenceItem, PainScaleItem } from '../types';

export const keywordRef: ReferenceItem[] = [
  { id: 'kw_1', value: 1, title: 'None', checked: false },
  { id: 'kw_2', value: 2, title: 'Chronic', checked: false },
  { id: 'kw_3', value: 3, title: 'Weak', checked: false },
  { id: 'kw_4', value: 4, title: 'Depression', checked: false },
  { id: 'kw_5', value: 5, title: 'Pain', checked: false },
  { id: 'kw_6', value: 6, title: 'Fever', checked: false },
  { id: 'kw_7', value: 7, title: 'Wellness', checked: false },
];

export const locationRef: ReferenceItem[] = [
  { id: 'loc_1', value: 1, title: 'Home', checked: false },
  { id: 'loc_2', value: 2, title: 'Work', checked: false },
  { id: 'loc_3', value: 3, title: 'School', checked: false },
  { id: 'loc_4', value: 4, title: 'Park', checked: false },
  { id: 'loc_5', value: 5, title: 'Indoors', checked: false },
  { id: 'loc_6', value: 6, title: 'Outdoors', checked: false },
];

export const painscaleRef: PainScaleItem[] = [
  { id: 'ps_1', name: 'Throbbing', severity_level: 'none' },
  { id: 'ps_2', name: 'Shooting', severity_level: 'none' },
  { id: 'ps_3', name: 'Stabbing', severity_level: 'none' },
  { id: 'ps_4', name: 'Sharp', severity_level: 'none' },
  { id: 'ps_5', name: 'Cramping', severity_level: 'none' },
  { id: 'ps_6', name: 'Gnawing', severity_level: 'none' },
  { id: 'ps_7', name: 'Burning', severity_level: 'none' },
  { id: 'ps_8', name: 'Aching', severity_level: 'none' },
  { id: 'ps_9', name: 'Heavy', severity_level: 'none' },
  { id: 'ps_10', name: 'Tender', severity_level: 'none' },
  { id: 'ps_11', name: 'Splitting', severity_level: 'none' },
  { id: 'ps_12', name: 'Tiring/Exhausting', severity_level: 'none' },
  { id: 'ps_13', name: 'Sickening', severity_level: 'none' },
  { id: 'ps_14', name: 'Fearful', severity_level: 'none' },
  { id: 'ps_15', name: 'Cruel/Punishing', severity_level: 'none' },
];

export const weekdayRef = [
  { id: 'wd_1', value: 1, title: 'Sun' },
  { id: 'wd_2', value: 2, title: 'Mon' },
  { id: 'wd_3', value: 3, title: 'Tues' },
  { id: 'wd_4', value: 4, title: 'Wed' },
  { id: 'wd_5', value: 5, title: 'Thu' },
  { id: 'wd_6', value: 6, title: 'Fri' },
  { id: 'wd_7', value: 7, title: 'Sat' },
];

export const emotionOptions = [
  { sentiment: 'smile' as const, emoji: '😊', label: 'Happy' },
  { sentiment: 'neutral' as const, emoji: '😐', label: 'Neutral' },
  { sentiment: 'worried' as const, emoji: '😟', label: 'Worried' },
  { sentiment: 'sad' as const, emoji: '😢', label: 'Sad' },
  { sentiment: 'angry' as const, emoji: '😠', label: 'Angry' },
];
