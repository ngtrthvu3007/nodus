// Package ratelimit counts events per key in a fixed time window, in memory.
// Enough for one API instance; move to a shared store when the API runs on several.
package ratelimit

import (
	"sync"
	"time"
)

type window struct {
	count   int
	startAt time.Time
}

type Limiter struct {
	limit   int
	period  time.Duration
	now     func() time.Time
	mutex   sync.Mutex
	windows map[string]window
}

// New allows `limit` events per key in each `period`.
func New(limit int, period time.Duration) *Limiter {
	return &Limiter{limit: limit, period: period, now: time.Now, windows: map[string]window{}}
}

// IsBlocked reports whether key already used up its events in the current window.
func (limiter *Limiter) IsBlocked(key string) bool {
	limiter.mutex.Lock()
	defer limiter.mutex.Unlock()

	current, ok := limiter.windows[key]

	return ok && !limiter.isExpired(current) && current.count >= limiter.limit
}

// Hit records one event for key.
func (limiter *Limiter) Hit(key string) {
	limiter.mutex.Lock()
	defer limiter.mutex.Unlock()

	limiter.removeExpired()

	current, ok := limiter.windows[key]
	if !ok || limiter.isExpired(current) {
		current = window{startAt: limiter.now()}
	}

	current.count++
	limiter.windows[key] = current
}

// Reset forgets the events of key.
func (limiter *Limiter) Reset(key string) {
	limiter.mutex.Lock()
	defer limiter.mutex.Unlock()

	delete(limiter.windows, key)
}

func (limiter *Limiter) isExpired(current window) bool {
	return limiter.now().Sub(current.startAt) >= limiter.period
}

// Keeps the map from growing with keys that are never hit again.
func (limiter *Limiter) removeExpired() {
	for key, current := range limiter.windows {
		if limiter.isExpired(current) {
			delete(limiter.windows, key)
		}
	}
}
