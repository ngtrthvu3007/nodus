package ratelimit

import (
	"testing"
	"time"
)

func TestLimiter(t *testing.T) {
	clock := time.Date(2026, 11, 14, 0, 0, 0, 0, time.UTC)
	limiter := New(2, time.Minute)
	limiter.now = func() time.Time { return clock }

	limiter.Hit("a")
	if limiter.IsBlocked("a") {
		t.Fatal("one hit of two must not block")
	}

	limiter.Hit("a")
	if !limiter.IsBlocked("a") {
		t.Fatal("two hits of two must block")
	}

	if limiter.IsBlocked("b") {
		t.Fatal("keys must be counted apart")
	}

	clock = clock.Add(time.Minute)
	if limiter.IsBlocked("a") {
		t.Fatal("a new window must unblock")
	}

	limiter.Hit("a")
	limiter.Hit("a")
	limiter.Reset("a")
	if limiter.IsBlocked("a") {
		t.Fatal("reset must unblock")
	}
}
