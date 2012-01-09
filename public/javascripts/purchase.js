var sandbox = false;

if (sandbox) {
  google.load('payments', '1.0', {
    'packages': ['sandbox_config']
  });
}
else {
  google.load('payments', '1.0', {
    'packages': ['production_config']
  });
}


function purchaseOnGoogleCheckout(email, productId) {
  var customPayload = { redeem_email: email };

  jsonp(sprintf('https://clockworkbilling.appspot.com/api/v1/order/koushd@gmail.com/%s?custom_payload=%s&buyer_id=%s&sandbox=%s', productId, encodeURIComponent(JSON.stringify(customPayload)), encodeURIComponent(email + ' ' + new Date().getTime()), sandbox),
    function(err, data) {
      if (err)
        return;
      if (data.purchased) {
        alert("You've already purchased this!");
        return;
      }
      goog.payments.inapp.buy({
          'jwt': data.jwt,
          'success': function() {
            alert('Thanks for purchasing! Please check your email for the redeem code!');
          },
          'failure': function() {}
          });
    });
}

function closeDialog() {
  $('#start-purchase').hide();
}

function startPurchase(productName, productId) {
  scroll(0,0);
  $('#product-id').text(productId);
  $('#buy-title').text(sprintf('Purchase %s Redeem Code', productName));
  $('#start-purchase').show();
}

function doPurchase() {
  var productId = $('#product-id').text();
  var email = $('#buy-email').val();
  var emailConfirm = $('#buy-email-confirm').val();
  if (email != emailConfirm) {
    alert('Emails do not match!');
    return;
  }
  
  closeDialog();
  purchaseOnGoogleCheckout(email, productId);
}

var product = $.query.get('buy_product');
if (product) {
  purchaseOnGoogleCheckout(product);
  window.location.hash = '';
}
