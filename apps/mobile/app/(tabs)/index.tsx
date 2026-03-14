import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StyleSheet, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { ReminderListItem } from '../../components/reminders/ReminderListItem';
import { StatCard } from '../../components/dashboard/StatCard';
import { FilterChips } from '../../components/reminders/FilterChips';
import { useTheme } from '../../hooks/useTheme';
import { format } from 'date-fns';

type Filter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: remindersData, refetch: refetchReminders } = useQuery({
    queryKey: ['reminders', filter],
    queryFn:  () => api.reminders.list(buildParams(filter)),
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['stats'],
    queryFn:  () => api.users.stats(),
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn:  () => api.users.me(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchReminders(), refetchStats()]);
    setRefreshing(false);
  }, [refetchReminders, refetchStats]);

  const reminders = remindersData?.data ?? [];
  const grouped   = groupByDate(reminders);

  const greeting  = getGreeting();
  const today     = format(new Date(), 'EEEE, MMMM d');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              {greeting}, {me?.data?.name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={[styles.date, { color: colors.text }]}>{today}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <StatCard label="Done"     value={stats?.completed ?? 0} color="#10B981" icon="checkmark-circle-outline" />
          <StatCard label="Overdue"  value={stats?.overdue   ?? 0} color="#EF4444" icon="alert-circle-outline"    />
          <StatCard label="Pending"  value={stats?.pending   ?? 0} color="#F59E0B" icon="time-outline"            />
          <StatCard label="Recurring"value={stats?.recurring ?? 0} color="#3F8EFC" icon="refresh-outline"         />
        </View>

        {/* Filter Chips */}
        <FilterChips active={filter} onChange={setFilter} />

        {/* Reminder List */}
        <View style={styles.listContainer}>
          {Object.entries(grouped).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All clear!</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Tap + to create your first reminder.
              </Text>
            </View>
          ) : (
            Object.entries(grouped).map(([dateLabel, items], groupIndex) => (
              <Animated.View
                key={dateLabel}
                entering={FadeInDown.delay(groupIndex * 50).duration(200)}
                style={styles.group}
              >
                <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
                  {dateLabel.toUpperCase()}
                </Text>
                {items.map((reminder) => (
                  <ReminderListItem
                    key={reminder.id}
                    reminder={reminder}
                    onPress={() => router.push(`/reminder/${reminder.id}`)}
                  />
                ))}
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB — Create Reminder */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/reminder/new')}
        accessibilityLabel="Create new reminder"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildParams(filter: Filter) {
  const now       = new Date().toISOString();
  const endOfDay  = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  switch (filter) {
    case 'today':     return { from: now, to: endOfDay.toISOString() };
    case 'upcoming':  return { status: 'pending', from: endOfDay.toISOString() };
    case 'overdue':   return { status: 'pending', to: now };
    case 'completed': return { status: 'completed' };
    default:          return {};
  }
}

function groupByDate(reminders: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  for (const r of reminders) {
    const d = new Date(r.fireAt);
    let label: string;
    if (isSameDay(d, today))    label = 'Today';
    else if (d < today)         label = 'Overdue';
    else if (isSameDay(d, tomorrow)) label = 'Tomorrow';
    else                        label = format(d, 'EEEE, MMM d');

    if (!groups[label]) groups[label] = [];
    groups[label].push(r);
  }
  return groups;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting:      { fontSize: 14, fontFamily: 'DMSans-Regular' },
  date:          { fontSize: 22, fontFamily: 'Outfit-Bold', marginTop: 2 },
  statsRow:      { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginVertical: 12 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  group:         { marginBottom: 24 },
  groupLabel:    { fontSize: 11, fontFamily: 'DMSans-Medium', letterSpacing: 1.2, marginBottom: 8 },
  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 20, fontFamily: 'Outfit-Bold', marginBottom: 8 },
  emptyText:     { fontSize: 14, fontFamily: 'DMSans-Regular', textAlign: 'center' },
  fab: {
    position:     'absolute',
    bottom:       24,
    right:        24,
    width:        60,
    height:       60,
    borderRadius: 30,
    alignItems:   'center',
    justifyContent: 'center',
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation:    8,
  },
});
