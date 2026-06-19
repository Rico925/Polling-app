import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

export default function HomeScreen() {
  const [polls, setPolls] = useState<any[]>([]);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPolls();
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

    if (error) {
      console.log('Vote error:', error);
      return;
    }

    fetchPolls();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🗳️ Trending Polls</Text>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const hasVoted = !!votedPolls[item.id];
          return (
            <View style={styles.pollCard}>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.category}>#{item.category} · {item.country_code}</Text>
              {item.options.map((option: any) => {
                const isSelected = votedPolls[item.id] === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleVote(item.id, option.id)}
                    disabled={hasVoted}
                  >
                    <Text style={styles.optionText}>
                      {option.text} {hasVoted ? `· ${option.vote_count} votes` : ''}
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
  category: { fontSize: 12, color: '#888', marginBottom: 12 },
  option: { backgroundColor: '#2a2a2a', borderRadius: 8, padding: 12, marginBottom: 8 },
  optionSelected: { backgroundColor: '#3a5fcd' },
  optionText: { color: '#ffffff', fontSize: 14 },
});