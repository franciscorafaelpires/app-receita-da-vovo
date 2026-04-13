import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getSession } from '@/lib/session';

export default function IndexRoute() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    async function resolveTarget() {
      const session = await getSession();
      setTarget(session ? '/(tabs)' : '/auth');
    }

    resolveTarget();
  }, []);

  if (!target) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={target as '/(tabs)' | '/auth'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
