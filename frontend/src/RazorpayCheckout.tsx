import React from "react";
import { Modal, View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";
import { AppText } from "./ui";

export type RzpOrder = {
  booking_id: string;
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  name: string;
  description: string;
  prefill: { name?: string; contact?: string; email?: string };
};

export type RzpSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

function buildHtml(o: RzpOrder, themeColor: string) {
  return `<!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head><body style="margin:0;background:transparent;">
  <script>
    function post(o){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }
    var options = {
      key: ${JSON.stringify(o.key_id)},
      amount: ${o.amount},
      currency: ${JSON.stringify(o.currency)},
      name: ${JSON.stringify(o.name)},
      description: ${JSON.stringify(o.description)},
      order_id: ${JSON.stringify(o.order_id)},
      prefill: ${JSON.stringify(o.prefill || {})},
      theme: { color: ${JSON.stringify(themeColor)} },
      handler: function(response){ post({ type: "success", response: response }); },
      modal: { ondismiss: function(){ post({ type: "dismiss" }); }, escape: true }
    };
    try {
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function(resp){ post({ type: "error", error: resp.error }); });
      rzp.open();
    } catch (e) {
      post({ type: "error", error: { description: String(e) } });
    }
  </script>
  </body></html>`;
}

export function RazorpayCheckout({
  order, onSuccess, onDismiss, onError,
}: {
  order: RzpOrder | null;
  onSuccess: (data: RzpSuccess, bookingId: string) => void;
  onDismiss: () => void;
  onError: (msg?: string) => void;
}) {
  const { colors } = useTheme();
  const visible = !!order;

  const handleMessage = (raw: string) => {
    let msg: any = null;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!order) return;
    if (msg.type === "success" && msg.response) {
      onSuccess(msg.response as RzpSuccess, order.booking_id);
    } else if (msg.type === "dismiss") {
      onDismiss();
    } else if (msg.type === "error") {
      onError(msg.error?.description);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={[styles.backdrop, { backgroundColor: colors.surface }]}>
        <Pressable testID="rzp-close" onPress={onDismiss} style={styles.close} hitSlop={12}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        {order ? (
          <WebView
            testID="rzp-webview"
            originWhitelist={["*"]}
            source={{ html: buildHtml(order, colors.indigo), baseUrl: "https://checkout.razorpay.com" }}
            onMessage={(e) => handleMessage(e.nativeEvent.data)}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1, backgroundColor: "transparent" }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.amber} />
                <AppText style={{ marginTop: 12, color: colors.onSurfaceSecondary }}>Loading secure checkout…</AppText>
              </View>
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  close: { alignSelf: "flex-end", padding: 16, paddingTop: 48 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
