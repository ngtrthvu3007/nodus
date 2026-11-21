package auth

import (
	"crypto/rand"
	"crypto/subtle"
	_ "embed"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"

	"go-nodus/internal/httpx"
)

const (
	minPasswordLength = 12
	maxPasswordLength = 64
)

// argon2id parameters (OWASP minimum). They are stored in each hash, so they can be raised later.
const (
	argonMemoryKiB  = 19 * 1024
	argonIterations = 2
	argonThreads    = 1
	argonSaltLength = 16
	argonKeyLength  = 32
)

// Common passwords of 12 to 64 characters, one per line, lowercase. Shorter ones are refused by length anyway.
//
//go:embed common_passwords.txt
var commonPasswordsFile string

var commonPasswords = parseCommonPasswords(commonPasswordsFile)

var errMalformedHash = errors.New("malformed password hash")

var errWeakPassword = httpx.NewError(
	http.StatusBadRequest,
	"invalid_params",
	"Password must be 12-64 characters and not a common password",
)

func parseCommonPasswords(file string) map[string]bool {
	passwords := map[string]bool{}
	for _, line := range strings.Split(file, "\n") {
		password := strings.TrimSpace(line)
		if password != "" {
			passwords[strings.ToLower(password)] = true
		}
	}

	return passwords
}

// checkPassword counts characters, not bytes, so accented letters count once.
// No rule on upper case, digits or symbols.
func checkPassword(password string) error {
	length := utf8.RuneCountInString(password)
	if length < minPasswordLength || length > maxPasswordLength {
		return errWeakPassword
	}

	if commonPasswords[strings.ToLower(password)] {
		return errWeakPassword
	}

	return nil
}

// hashPassword returns a PHC string: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<key>.
func hashPassword(password string) string {
	salt := make([]byte, argonSaltLength)
	// Never fails since Go 1.24: it crashes the program instead of returning an error.
	_, _ = rand.Read(salt)

	key := argon2.IDKey([]byte(password), salt, argonIterations, argonMemoryKiB, argonThreads, argonKeyLength)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		argonMemoryKiB,
		argonIterations,
		argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	)
}

// verifyPassword reads the parameters from the hash itself, so hashes made with older parameters still verify.
func verifyPassword(password string, encodedHash string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errMalformedHash
	}

	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil || version != argon2.Version {
		return false, errMalformedHash
	}

	var memoryKiB, iterations uint32
	var threads uint8
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memoryKiB, &iterations, &threads)
	if err != nil {
		return false, errMalformedHash
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, errMalformedHash
	}

	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, errMalformedHash
	}

	candidate := argon2.IDKey([]byte(password), salt, iterations, memoryKiB, threads, uint32(len(key)))

	return subtle.ConstantTimeCompare(key, candidate) == 1, nil
}
