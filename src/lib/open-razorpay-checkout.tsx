import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useMemo, useState } from 'react';
import { COLORS, RADIUS, SPACING } from '../theme';

export type RazorpayCheckoutInput = {
  keyId: string;
  amount: number;
  currency?: string;
  orderId: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

export type RazorpayCheckoutResult =
  | {
      ok: true;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  | { ok: false; cancelled?: boolean; message: string };

function buildCheckoutHtml(input: RazorpayCheckoutInput) {
  const payload = JSON.stringify({
    key: input.keyId,
    amount: input.amount,
    currency: input.currency || 'INR',
    order_id: input.orderId,
    name: input.name || 'AsliLearn.ai',
    description: input.description || 'Subscription',
    prefill: input.prefill || {},
    theme: { color: '#0284c7' },
  });
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<style>body{font-family:sans-serif;background:#f8fafc;margin:0;padding:24px;color:#334155}</style>
</head><body>
<p>Opening secure payment…</p>
<script>
  var options = ${payload};
  options.handler = function (response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', data: response }));
  };
  options.modal = {
    ondismiss: function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
    }
  };
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function (resp) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'failed',
      message: (resp && resp.error && resp.error.description) || 'Payment failed'
    }));
  });
  rzp.open();
</script>
</body></html>`;
}

export function RazorpayCheckoutModal({
  visible,
  input,
  onClose,
  onComplete,
}: {
  visible: boolean;
  input: RazorpayCheckoutInput | null;
  onClose: () => void;
  onComplete: (result: RazorpayCheckoutResult) => void;
}) {
  const [loading, setLoading] = useState(true);
  const html = useMemo(() => (input ? buildCheckoutHtml(input) : ''), [input]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'success' && msg.data) {
        onComplete({
          ok: true,
          razorpay_order_id: msg.data.razorpay_order_id,
          razorpay_payment_id: msg.data.razorpay_payment_id,
          razorpay_signature: msg.data.razorpay_signature,
        });
        onClose();
        return;
      }
      if (msg.type === 'dismiss') {
        onComplete({ ok: false, cancelled: true, message: 'Payment cancelled.' });
        onClose();
        return;
      }
      if (msg.type === 'failed') {
        onComplete({ ok: false, message: msg.message || 'Payment failed.' });
        onClose();
      }
    } catch {
      onComplete({ ok: false, message: 'Could not read payment response.' });
      onClose();
    }
  };

  if (!visible || !input) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Pay with Razorpay</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.secondary} />
        </View>
      ) : null}
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={styles.webview}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  close: { fontSize: 15, fontWeight: '600', color: COLORS.secondary },
  loader: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  webview: { flex: 1, backgroundColor: '#f8fafc' },
});
