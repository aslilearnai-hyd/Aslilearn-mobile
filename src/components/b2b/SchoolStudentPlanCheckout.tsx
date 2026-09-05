import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { createIndividualOrder, getSchoolStudentPlan, verifyIndividualPayment } from '../../lib/billing-api';
import { RazorpayCheckoutModal, type RazorpayCheckoutInput, type RazorpayCheckoutResult } from '../../lib/open-razorpay-checkout';
import { COLORS, RADIUS, SPACING } from '../../theme';

export default function SchoolStudentPlanCheckout({ user, onPaid }: { user: any; onPaid: () => void }) {
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<RazorpayCheckoutInput | null>(null);
  useEffect(() => { getSchoolStudentPlan().then(setConfig).catch((e) => setError(e.message)); }, []);
  const start = async () => {
    setBusy(true); setError('');
    try {
      const order = await createIndividualOrder({ packageType: 'school', period: 'year', classLabel: '', track: '' });
      setCheckout({ keyId: order.keyId, amount: order.amount, currency: order.currency, orderId: order.orderId, name: 'AsliLearn.ai', description: 'Student yearly subscription', prefill: order.prefill });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start payment.'); }
    finally { setBusy(false); }
  };
  const complete = async (result: RazorpayCheckoutResult) => {
    if (!result.ok) { if (!result.cancelled) setError(result.message); return; }
    try { await verifyIndividualPayment({ ...result, ok: undefined, packageType: 'school', period: 'year' }); onPaid(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Payment verification failed.'); }
  };
  if (!config && !error) return <ActivityIndicator color={COLORS.secondary} />;
  const amount = Number(config?.plan?.amountInr || user?.schoolStudentAnnualPriceInr || 0);
  return <View style={styles.card}>
    <Text style={styles.kicker}>SCHOOL STUDENT PLAN</Text><Text style={styles.price}>₹{amount.toLocaleString('en-IN')} <Text style={styles.period}>/ year</Text></Text>
    <Text style={styles.copy}>Yearly access for this student account. Teachers and school administrators are not billed here.</Text>
    {config?.onlineEnabled ? <Pressable style={[styles.button, (busy || amount <= 0) && styles.disabled]} disabled={busy || amount <= 0} onPress={start}><Text style={styles.buttonText}>{busy ? 'Opening payment…' : 'Pay securely with Razorpay'}</Text></Pressable> :
      <View style={styles.notice}><Text style={styles.noticeText}>Your school collects this payment offline. Contact your school administrator or AsliLearn support to activate access.</Text></View>}
    {config?.paymentMode === 'both' && <Text style={styles.note}>You may pay online here or pay your school offline.</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    <RazorpayCheckoutModal visible={!!checkout} input={checkout} onClose={() => setCheckout(null)} onComplete={complete} />
  </View>;
}
const styles = StyleSheet.create({ card:{gap:SPACING.md,padding:SPACING.lg,borderRadius:RADIUS.xl,borderWidth:1,borderColor:'#C7D2FE',backgroundColor:'#EEF2FF'},kicker:{fontSize:12,fontWeight:'800',color:'#4338CA'},price:{fontSize:30,fontWeight:'900',color:COLORS.text},period:{fontSize:14,fontWeight:'600',color:COLORS.textMuted},copy:{fontSize:14,lineHeight:21,color:COLORS.textMuted},button:{padding:15,borderRadius:RADIUS.lg,backgroundColor:'#4F46E5',alignItems:'center'},disabled:{opacity:.5},buttonText:{color:'#fff',fontWeight:'800'},notice:{padding:14,borderRadius:RADIUS.md,backgroundColor:'#fff'},noticeText:{fontSize:14,lineHeight:20,color:COLORS.text},note:{fontSize:12,color:COLORS.textMuted},error:{fontSize:13,color:'#DC2626'}});
