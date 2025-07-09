// admin/admin.js

// Logout function: clears localStorage and redirects to login page
function logout() {
  localStorage.removeItem('adminAuthenticated');
  localStorage.removeItem('adminKey');
  window.location.href = '/admin-login.html';
}

// Attach event listener for logout button
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });
  }

  // Fetch orders on page load
  fetchOrders();
});

async function fetchOrders() {
  const ordersTableBody = document.getElementById('orders-body');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  loading.style.display = 'block';
  error.style.display = 'none';
  ordersTableBody.innerHTML = '';

  const adminAuthenticated = localStorage.getItem('adminAuthenticated');
  const adminKey = localStorage.getItem('adminKey');

  if (!adminAuthenticated || !adminKey) {
    window.location.href = '/admin-login.html';
    return;
  }

  try {
    const res = await fetch('/api/orders', {
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        alert('Session expired or unauthorized. Please login again.');
        logout();
        return;
      }
      throw new Error(`Error fetching orders: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!Array.isArray(data.orders) || data.orders.length === 0) {
      ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders found.</td></tr>';
    } else {
      data.orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td data-label="Name">${order.name}</td>
          <td data-label="Address">${order.address}</td>
          <td data-label="Age">${order.age}</td>
          <td data-label="Symptoms">${order.symptoms}</td>
          <td data-label="Medicine">${order.medicine}</td>
          <td data-label="Order Time">${new Date(order.created_at).toLocaleString()}</td>
        `;
        ordersTableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
    error.textContent = 'Failed to load orders. Please try again later.';
    error.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}
