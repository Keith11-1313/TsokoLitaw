import http from "k6/http";
import { check, sleep } from "k6";

const profile = __ENV.PROFILE ?? "smoke";
const baseUrl = (__ENV.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const authCookie = __ENV.AUTH_COOKIE ?? "";
const orderId = __ENV.ORDER_ID ?? "";

const profiles = {
  smoke: {
    scenarios: {
      smoke: {
        executor: "constant-vus",
        vus: 3,
        duration: "30s",
      },
    },
  },
  capacity: {
    scenarios: {
      steady_capacity: {
        executor: "ramping-vus",
        startVUs: 0,
        stages: [
          { duration: "1m", target: 10 },
          { duration: "1m", target: 25 },
          { duration: "1m", target: 50 },
          { duration: "2m", target: 100 },
          { duration: "10m", target: 100 },
          { duration: "1m", target: 0 },
        ],
        gracefulRampDown: "30s",
      },
      recovery_spike: {
        executor: "ramping-vus",
        startTime: "17m",
        startVUs: 0,
        stages: [
          { duration: "10s", target: 100 },
          { duration: "30s", target: 100 },
          { duration: "20s", target: 0 },
        ],
        gracefulRampDown: "10s",
      },
    },
  },
};

if (!(profile in profiles)) {
  throw new Error(`Unknown PROFILE: ${profile}`);
}

export const options = {
  ...profiles[profile],
  discardResponseBodies: true,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

function authenticatedHeaders() {
  return authCookie ? { headers: { Cookie: authCookie } } : undefined;
}

export default function storefrontTraffic() {
  const roll = Math.random();
  let route = "/";
  let requestOptions;

  if (roll < 0.35) {
    route = "/our-creations";
  } else if (roll < 0.55) {
    route = "/journal";
  } else if (roll < 0.85 && authCookie) {
    route = "/orders";
    requestOptions = authenticatedHeaders();
  } else if (authCookie && orderId) {
    route = `/orders/${encodeURIComponent(orderId)}`;
    requestOptions = authenticatedHeaders();
  }

  const response = http.get(`${baseUrl}${route}`, {
    ...requestOptions,
    tags: { route },
    redirects: 0,
  });

  check(response, {
    "route returned a successful document": (result) => result.status >= 200 && result.status < 400,
  });
  sleep(0.5 + Math.random() * 1.5);
}
