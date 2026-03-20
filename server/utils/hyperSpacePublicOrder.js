/**
 * HyperSpace order shapes for non-admin clients (no provider-specific field names or messages).
 */

function userSafeErrorMessage(msg) {
  if (msg == null || typeof msg !== 'string') return msg;
  if (/socialplug/i.test(msg)) {
    const lower = msg.toLowerCase();
    if (lower.includes('canceled') || lower.includes('cancelled')) {
      return 'This order was cancelled. Please contact support if you need help.';
    }
    if (lower.includes('refunded')) {
      return 'This order was refunded. Please contact support if you need help.';
    }
    return 'This order could not be completed. Please contact support.';
  }
  return msg;
}

function toPlain(order) {
  if (!order) return null;
  return typeof order.toObject === 'function'
    ? order.toObject({ virtuals: true })
    : { ...order };
}

function serializeHyperSpaceOrderForUser(order) {
  const o = toPlain(order);
  if (!o) return null;
  return {
    orderId: o.orderId,
    spaceUrl: o.spaceUrl,
    listeners: o.listenerCount,
    duration: o.duration,
    durationLabel: o.durationLabel,
    price: o.customerPrice,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    completedAt: o.completedAt,
    errorMessage: userSafeErrorMessage(o.errorMessage),
    deliveryEndsAt: o.deliveryEndsAt,
    autoCompleted: o.autoCompleted
  };
}

function serializeHyperSpaceOrderListItemForUser(order) {
  const o = toPlain(order);
  if (!o) return null;
  return {
    orderId: o.orderId,
    spaceUrl: o.spaceUrl,
    listeners: o.listenerCount,
    duration: o.duration,
    price: o.customerPrice,
    status: o.status,
    createdAt: o.createdAt,
    completedAt: o.completedAt,
    deliveryEndsAt: o.deliveryEndsAt,
    autoCompleted: o.autoCompleted
  };
}

module.exports = {
  userSafeErrorMessage,
  serializeHyperSpaceOrderForUser,
  serializeHyperSpaceOrderListItemForUser,
  toPlain
};
