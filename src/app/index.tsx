import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  if (mins > 0) return `${mins}m ${secs}s left`;
  return `${secs}s left`;
}

export default function HomeScreen() {
  const [polls, setPolls] = useState<any[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchPolls();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function fetchPolls() {
    const { data, error } = await supabase
      .from('polls')
      .select('*, options(*)')
      .order('created_at', { ascending: false });
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
    fetchPolls();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🗳️ Trending Polls</Text>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        extraData={now}
        renderItem={({ item }) => {
          const hasVoted = !!votedPolls[item.id];
          const isExpired = new Date(item.expires_at).getTime() < now;
          const timeLeft = getTimeLeft(item.expires_at);
          const winner = isExpired
            ? item.options.reduce((a: any, b: any) =>
                a.vote_count >= b.vote_count ? a : b, item.options[0])
            : null;

          return (
            <View style={styles.pollCard}>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.category}>#{item.category} · {item.country_code}</Text>
              <Text style={[styles.timer, isExpired && styles.timerEnded]}>
                {isExpired ? '🔒 Poll Ended' : `⏱ ${timeLeft}`}
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
  header: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 20 },
  pollCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 },
  question: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  category: { fontSize: 12, color: '#888', marginBottom: 6 },
  timer: { fontSize: 12, color: '#4a9eff', marginBottom: 12, fontWeight: '500' },
  timerEnded: { color: '#888' },
  option: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 8 },
  optionSelected: { backgroundColor: '#3a5fcd' },
  optionWinner: { backgroundColor: '#2d6a2d' },
  optionText: { color: '#ffffff', fontSize: 14 },
});