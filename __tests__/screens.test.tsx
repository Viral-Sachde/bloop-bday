import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParams: any = {};

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, reset: jest.fn() }),
    useRoute: () => ({ params: mockParams }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
  };
});

import { EditorScreen } from '../src/screens/EditorScreen';
import { CircleScreen } from '../src/screens/CircleScreen';
import { HomeScreen } from '../src/screens/HomeScreen';
import { PersonScreen } from '../src/screens/PersonScreen';
import { DEFAULT_SETTINGS, useStore } from '../src/store';

const base = { kind: 'birthday' as const, relation: 'friend' as const, source: 'manual' as const };

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return { month: d.getMonth() + 1, day: d.getDate() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  useStore.setState({ events: [], settings: { ...DEFAULT_SETTINGS, onboarded: true }, hydrated: true });
});

describe('HomeScreen', () => {
  test('empty state offers import and add', async () => {
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-empty')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('empty-import'));
    expect(mockNavigate).toHaveBeenCalledWith('Import');
    await fireEvent.press(screen.getByTestId('empty-add'));
    expect(mockNavigate).toHaveBeenCalledWith('Editor');
  });

  test('hero shows the soonest person and groups the rest', async () => {
    useStore.getState().addEvent({ ...base, name: 'Later Larry', ...daysFromNow(100) });
    useStore.getState().addEvent({ ...base, name: 'Soon Sana', ...daysFromNow(2) });
    useStore.getState().addEvent({ ...base, name: 'Today Tia', ...daysFromNow(0) });
    await render(<HomeScreen />);
    expect(screen.getByTestId('hero-card')).toBeTruthy();
    expect(screen.getByText(/Today Tia's birthday/)).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Later')).toBeTruthy();
    expect(screen.getByTestId('event-row-Soon Sana')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('hero-wish'));
    expect(mockNavigate).toHaveBeenCalledWith('Person', expect.objectContaining({ openWishes: true }));
  });

  test('shows the inline ad slot once there are people', async () => {
    useStore.getState().addEvent({ ...base, name: 'Aman', ...daysFromNow(3) });
    await render(<HomeScreen />);
    expect(screen.getByTestId('ad-inline')).toBeTruthy();
  });
});

describe('EditorScreen', () => {
  test('refuses an empty name', async () => {
    await render(<EditorScreen />);
    await fireEvent.press(screen.getByTestId('editor-save'));
    expect(screen.getByTestId('editor-error').props.children).toBe('Add a name first');
    expect(useStore.getState().events).toHaveLength(0);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  test('custom occasion needs a title', async () => {
    await render(<EditorScreen />);
    await fireEvent.changeText(screen.getByTestId('editor-name'), 'Aman');
    await fireEvent.press(screen.getByTestId('kind-custom'));
    await fireEvent.press(screen.getByTestId('editor-save'));
    expect(screen.getByTestId('editor-error').props.children).toMatch(/Name the occasion/);
    await fireEvent.changeText(screen.getByTestId('editor-title'), 'Graduation');
    await fireEvent.press(screen.getByTestId('editor-save'));
    expect(useStore.getState().events[0]).toMatchObject({ name: 'Aman', kind: 'custom', title: 'Graduation' });
  });

  test('saves a person with relation and phone, then closes', async () => {
    await render(<EditorScreen />);
    await fireEvent.changeText(screen.getByTestId('editor-name'), '  Riya Sharma ');
    await fireEvent.press(screen.getByTestId('rel-family'));
    await fireEvent.changeText(screen.getByTestId('editor-phone'), '+91 98765 43210');
    await fireEvent.press(screen.getByTestId('editor-save'));
    expect(useStore.getState().events[0]).toMatchObject({
      name: 'Riya Sharma',
      relation: 'family',
      phone: '+91 98765 43210',
      source: 'manual',
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('editing updates in place instead of duplicating', async () => {
    const e = useStore.getState().addEvent({ ...base, name: 'Aman', month: 10, day: 12 });
    mockParams = { id: e.id };
    await render(<EditorScreen />);
    expect(screen.getByTestId('editor-name').props.value).toBe('Aman');
    await fireEvent.changeText(screen.getByTestId('editor-name'), 'Aman Gupta');
    await fireEvent.press(screen.getByTestId('editor-save'));
    const list = useStore.getState().events;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Aman Gupta');
  });
});

describe('CircleScreen', () => {
  beforeEach(() => {
    const { addEvent } = useStore.getState();
    addEvent({ ...base, name: 'Aman', relation: 'friend', ...daysFromNow(3) });
    addEvent({ ...base, name: 'Riya', relation: 'family', ...daysFromNow(200) });
    addEvent({ ...base, name: 'Karan', relation: 'work', ...daysFromNow(10) });
  });

  test('search narrows the list', async () => {
    await render(<CircleScreen />);
    expect(screen.getAllByTestId(/event-row-/)).toHaveLength(3);
    await fireEvent.changeText(screen.getByTestId('circle-search'), 'riy');
    expect(screen.getAllByTestId(/event-row-/)).toHaveLength(1);
    await fireEvent.changeText(screen.getByTestId('circle-search'), 'zzz');
    expect(screen.getByTestId('circle-empty')).toBeTruthy();
  });

  test('filter sheet: pick relation, apply, clear', async () => {
    await render(<CircleScreen />);
    await fireEvent.press(screen.getByTestId('circle-filter'));
    await waitFor(() => expect(screen.getByTestId('filter-sheet')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('filter-rel-family'));
    expect(screen.getByTestId('filter-selected')).toBeTruthy(); // "Selected" chips row appears
    await fireEvent.press(screen.getByTestId('filter-apply'));
    await waitFor(() => expect(screen.getAllByTestId(/event-row-/)).toHaveLength(1));
    expect(screen.getByTestId('event-row-Riya')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('circle-filter'));
    await waitFor(() => expect(screen.getByTestId('filter-clear')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('filter-clear'));
    await fireEvent.press(screen.getByTestId('filter-apply'));
    await waitFor(() => expect(screen.getAllByTestId(/event-row-/)).toHaveLength(3));
  });

  test('time window slider filters by days', async () => {
    await render(<CircleScreen />);
    await fireEvent.press(screen.getByTestId('circle-filter'));
    await waitFor(() => expect(screen.getByTestId('filter-within-step-1')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('filter-within-step-1')); // 30d
    await fireEvent.press(screen.getByTestId('filter-apply'));
    await waitFor(() => expect(screen.getAllByTestId(/event-row-/)).toHaveLength(2));
  });
});

describe('PersonScreen', () => {
  const setup = () => {
    const e = useStore.getState().addEvent({ ...base, name: 'Aman Gupta', phone: '+91 98765 43210', year: 1998, ...daysFromNow(1) });
    mockParams = { id: e.id };
    return e;
  };

  test('shows default reminders, then a per-person override and reset', async () => {
    const e = setup();
    await render(<PersonScreen />);
    expect(screen.getByText('Your defaults')).toBeTruthy();
    expect(screen.getByText(/12:00 AM sharp/)).toBeTruthy();
    expect(screen.getByText(/11:55 PM, the night before/)).toBeTruthy();

    await act(async () => useStore.getState().updateEvent(e.id, { reminders: [{ id: 'c', daysBefore: 2, hour: 8, minute: 0 }] }));
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.getByText('8:00 AM, 2 days before')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('rule-reset'));
    expect(useStore.getState().events[0].reminders).toBeUndefined();
  });

  test('wishes: free ones visible, premium locked until unlocked', async () => {
    setup();
    await render(<PersonScreen />);
    expect(screen.getAllByTestId('wish').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('wish-locked').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('unlock-wishes').length).toBeGreaterThan(0);
    await act(async () => useStore.getState().updateSettings({ premiumWishesUntil: Date.now() + 1000 * 60 }));
    expect(screen.queryAllByTestId('wish-locked')).toHaveLength(0);
  });

  test('tone chips change the wishes', async () => {
    setup();
    await render(<PersonScreen />);
    const before = screen.getAllByTestId('wish-text')[0].props.children;
    await fireEvent.press(screen.getByTestId('tone-short'));
    expect(screen.getAllByTestId('wish-text')[0].props.children).not.toBe(before);
  });

  test('remove goes through a confirmation sheet', async () => {
    setup();
    await render(<PersonScreen />);
    await fireEvent.press(screen.getByTestId('person-remove'));
    await waitFor(() => expect(screen.getByTestId('confirm-sheet')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-no'));
    expect(useStore.getState().events).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('person-remove'));
    await waitFor(() => expect(screen.getByTestId('confirm-yes')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('confirm-yes'));
    expect(useStore.getState().events).toHaveLength(0);
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('a removed person renders a safe fallback instead of crashing', async () => {
    mockParams = { id: 'does-not-exist' };
    await render(<PersonScreen />);
    expect(screen.getByText('This person was removed.')).toBeTruthy();
  });
});
