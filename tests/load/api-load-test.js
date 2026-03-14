/**
 * GoodLifeTask — Load Test (k6)
 * Target: 50,000 concurrent users, P99 < 200ms, < 1% error rate
 *
 * Run: k6 run tests/load/api-load-test.js --env BASE_URL=https://api.goodlifetask.com
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const errorRate    = new Rate('error_rate');
const apiDuration  = new Trend('api_duration', true);
const authSuccess  = new Counter('auth_success');
const reminderOps  = new Counter('reminder_operations');

// ─── Options ─────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '2m',  target: 1000  },  // ramp-up to 1K
    { duration: '5m',  target: 10000 },  // ramp-up to 10K
    { duration: '5m',  target: 50000 },  // peak: 50K
    { duration: '5m',  target: 50000 },  // sustain 50K
    { duration: '3m',  target: 0     },  // ramp-down
  ],
  thresholds: {
    http_req_duration:                  ['p(99)<200', 'p(95)<100'], // P99<200ms, P95<100ms
    http_req_failed:                    ['rate<0.01'],               // <1% HTTP errors
    error_rate:                         ['rate<0.01'],
    'http_req_duration{name:dashboard}':['p(99)<200'],
    'http_req_duration{name:create_reminder}': ['p(99)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/v1';

// ─── Test Data ────────────────────────────────────────────────────────────────
function randomEmail() {
  return `loadtest_${Math.random().toString(36).slice(2)}@example.com`;
}

function randomTitle() {
  const titles = [
    'Call dentist', 'Submit report', 'Review PR', 'Team standup',
    'Pay bills', 'Doctor appointment', 'Buy groceries', 'Exercise',
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

// ─── Auth Helper ──────────────────────────────────────────────────────────────
function authenticate() {
  const email    = randomEmail();
  const password = 'LoadTest123!';

  // Register
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password, name: 'Load Test User' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'register' } },
  );

  check(registerRes, {
    'register status 201': (r) => r.status === 201,
  });

  if (registerRes.status !== 201) {
    errorRate.add(1);
    return null;
  }

  authSuccess.add(1);
  const body = JSON.parse(registerRes.body);
  return body.data.tokens.access_token;
}

// ─── Main Scenario ────────────────────────────────────────────────────────────
export default function () {
  const token = authenticate();
  if (!token) return;

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 1. Get dashboard stats
  const statsRes = http.get(`${BASE_URL}/users/me/stats`, {
    headers,
    tags: { name: 'dashboard' },
  });
  apiDuration.add(statsRes.timings.duration);
  check(statsRes, { 'stats 200': (r) => r.status === 200 });
  errorRate.add(statsRes.status !== 200 ? 1 : 0);

  sleep(0.5);

  // 2. List reminders
  const listRes = http.get(`${BASE_URL}/reminders?limit=20&sort=fire_at&order=asc`, {
    headers,
    tags: { name: 'list_reminders' },
  });
  apiDuration.add(listRes.timings.duration);
  check(listRes, { 'list 200': (r) => r.status === 200 });
  errorRate.add(listRes.status !== 200 ? 1 : 0);

  sleep(0.5);

  // 3. Create a reminder
  const fireAt = new Date(Date.now() + 3600000).toISOString();
  const createRes = http.post(
    `${BASE_URL}/reminders`,
    JSON.stringify({
      type:     'task',
      title:    randomTitle(),
      fire_at:  fireAt,
      priority: 'medium',
    }),
    { headers, tags: { name: 'create_reminder' } },
  );
  apiDuration.add(createRes.timings.duration);
  check(createRes, { 'create 201': (r) => r.status === 201 });
  errorRate.add(createRes.status !== 201 ? 1 : 0);

  if (createRes.status === 201) {
    reminderOps.add(1);
    const reminderId = JSON.parse(createRes.body).data.id;

    sleep(0.3);

    // 4. Mark as complete
    const completeRes = http.post(
      `${BASE_URL}/reminders/${reminderId}/complete`,
      null,
      { headers, tags: { name: 'complete_reminder' } },
    );
    check(completeRes, { 'complete 200': (r) => r.status === 200 });
    reminderOps.add(1);
  }

  sleep(1);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'tests/load/results/summary.json': JSON.stringify(data, null, 2),
    stdout: `
╔══════════════════════════════════════════════════════╗
║         GoodLifeTask Load Test Results               ║
╠══════════════════════════════════════════════════════╣
║ P50 latency: ${data.metrics.http_req_duration?.values?.p50?.toFixed(1) ?? 'N/A'} ms
║ P95 latency: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(1) ?? 'N/A'} ms
║ P99 latency: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(1) ?? 'N/A'} ms
║ Error rate:  ${(data.metrics.error_rate?.values?.rate * 100)?.toFixed(2) ?? 'N/A'}%
║ Total requests: ${data.metrics.http_reqs?.values?.count ?? 'N/A'}
╚══════════════════════════════════════════════════════╝
    `,
  };
}
