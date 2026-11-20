package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"
)

// A fixed prefix lets secret scanners recognize a leaked token.
const tokenPrefix = "nod_"

const secretLength = 32

// generateSecret returns 32 random bytes as base64url, used as a session cookie value.
func generateSecret() string {
	buffer := make([]byte, secretLength)
	// Never fails since Go 1.24: it crashes the program instead of returning an error.
	_, _ = rand.Read(buffer)

	return base64.RawURLEncoding.EncodeToString(buffer)
}

func generateToken() string {
	return tokenPrefix + generateSecret()
}

func isToken(value string) bool {
	return strings.HasPrefix(value, tokenPrefix)
}

// hashSecret is SHA-256: the secrets are random, so a slow hash adds nothing.
func hashSecret(secret string) string {
	sum := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(sum[:])
}
