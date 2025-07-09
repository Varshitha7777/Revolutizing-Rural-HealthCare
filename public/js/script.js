let generatedOTP = null;

// Function to show toast messages
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontSize = '16px';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '200px';
    toast.style.textAlign = 'center';
    toast.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    document.body.appendChild(toast);
  }

  toast.style.backgroundColor = type === 'error' ? '#e74c3c' : '#27ae60';
  toast.textContent = message;
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

// Send OTP Handler
function handleSendOTP() {
  const mobileInput = document.getElementById('mobile');
  const mobileNumber = mobileInput.value.trim();

  if (!mobileNumber || !/^(\+91)?[6-9]\d{9}$/.test(mobileNumber)) {
    showToast('Enter a valid mobile number', 'error');
    return;
  }

  generatedOTP = Math.floor(100000 + Math.random() * 900000);
  console.log('✅ OTP sent:', generatedOTP); // For testing
  showToast('OTP sent to your number');

  document.getElementById('otpSection').style.display = 'block';
}

// Verify OTP Handler
function handleVerifyOTP() {
  const enteredOTP = document.getElementById('otp').value.trim();

  if (!enteredOTP) {
    showToast('Please enter the OTP', 'error');
    return;
  }

  if (enteredOTP === generatedOTP.toString()) {
    showToast('OTP Verified! Redirecting...');
    setTimeout(() => {
      window.location.href = 'voice.html';
    }, 1500);
  } else {
    showToast('Invalid OTP. Try again.', 'error');
  }
}

// Attach event listeners after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sendOTPBtn')?.addEventListener('click', handleSendOTP);
  document.getElementById('verifyOTPBtn')?.addEventListener('click', handleVerifyOTP);
});
