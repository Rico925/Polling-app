import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

const SPORT_FILTERS = ['All', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Baseball'];

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  if (mins > 0) return `${mins}m ${secs}s left`;
  return `${secs}s left`;
}

export default function SportsScreen() {
  const [polls, setPolls] = useState<any[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [selectedSport, setSelectedSport] = useState('All');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchSportsPolls();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [selectedSport]);

  async function fetchSportsPolls() {
    let query = supabase
      .from('polls')
      .select('*, options(*)')
      .eq('category', 'sports')
      .order('created_at', { ascending: false });

    if (selectedSport !== 'All') {
      query = query.eq('sport_type', selectedSport.toLowerCase());
    }

    const { data, error } = await query;
    if (error) console.log('Fetch error:', error);
    else setPolls(data);
  }

  async function handleVote(pollId: string, optionId: string) {
    if (votedPolls[pollId]) return;
    setVotedPolls((prev) => ({ ...prev, [pollId]: optionId }));
    const { error } = await supabase.rpc('increment_vote', {
      option_id_input: optionId,
    });
    if (error) { console.log('Vote error:', error); return; }
    fetchSportsPolls();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🏅 Sports Polls</Text>

      {/* Sport filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {SPORT_FILTERS.map((sport) => (
          <TouchableOpacity
            key={sport}
            style={[styles.filterTab, selectedSport === sport && styles.filterTabActive]}
            onPress={() => setSelectedSport(sport)}
          >
            <Text style={[styles.filterText, selectedSport === sport && styles.filterTextActive]}>
              {sport}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        extraData={now}
        ListEmptyComponent={
          <Text style={styles.empty}>No {selectedSport} polls yet — check back soon!</Text>
        }
        renderItem={({ item }) => {
          const hasVoted = !!votedPolls[item.id];
          const isExpired = new Date(item.expires_at).getTime() < now;
          const winner = isExpired
            ? item.options.reduce((a: any, b: any) =>
                a.vote_count >= b.vote_count ? a : b, item.options[0])
            : null;

          return (
            <View style={styles.pollCard}>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>
                  {item.sport_type ? item.sport_type.toUpperCase() : 'SPORTS'}
                </Text>
              </View>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={[styles.timer, isExpired && styles.timerEnded]}>
                {isExpired ? '🔒 Poll Ended' : `⏱ ${getTimeLeft(item.expires_at)}`}
              </Text>
              {item.options.map((option: any) => {
                const isSelected = votedPolls[item.id] === option.id;
                const isWinner = isExpired && winner?.id === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                      isWinner && styles.optionWinner,
                    ]}
                    onPress={() => handleVote(item.id, option.id)}
                    disabled={hasVoted || isExpired}
                  >
                    <Text style={styles.optionText}>
                      {isWinner ? '🏆 ' : ''}{option.text}
                      {(hasVoted || isExpired) ? ` · ${option.vote_count} votes` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16, paddingTop: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  filterRow: { marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a1a', marginRight: 8 },
  filterTabActive: { backgroundColor: '#3a5fcd' },
  filterText: { color: '#888', fontSize: 13 },
  filterTextActive: { color: '#ffffff', fontWeight: '600' },
  pollCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 },
  sportBadge: { backgroundColor: '#2a2a2a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  sportBadgeText: { color: '#4a9eff', fontSize: 11, fontWeight: '700' },
  question: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  timer: { fontSize: 12, color: '#4a9eff', marginBottom: 12, fontWeight: '500' },
  timerEnded: { color: '#888' },
  option: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 8 },
  optionSelected: { backgroundColor: '#3a5fcd' },
  optionWinner: { backgroundColor: '#2d6a2d' },
  optionText: { color: '#ffffff', fontSize: 14 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 14 },
});