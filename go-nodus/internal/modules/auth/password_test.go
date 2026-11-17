package auth

import (
	"errors"
	"strings"
	"testing"
)

func TestCheckPassword(t *testing.T) {
	cases := []struct {
		password string
		valid    bool
	}{
		{"short pass", false},
		{"long enough passphrase", true},
		{"mật khẩu dài", true},
		{strings.Repeat("a", 64) + "b", false},
		{"Password1234", false},
		{"correct horse battery", true},
	}

	for _, testCase := range cases {
		err := checkPassword(testCase.password)
		if testCase.valid && err != nil {
			t.Fatalf("%q must be accepted, got %v", testCase.password, err)
		}

		if !testCase.valid && !errors.Is(err, errWeakPassword) {
			t.Fatalf("%q must be refused", testCase.password)
		}
	}
}

func TestHashPassword(t *testing.T) {
	hash := hashPassword("correct horse battery")

	if !strings.HasPrefix(hash, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Fatalf("hash = %q", hash)
	}

	if hash == hashPassword("correct horse battery") {
		t.Fatal("each hash must use its own salt")
	}

	ok, err := verifyPassword("correct horse battery", hash)
	if err != nil || !ok {
		t.Fatalf("right password: ok=%v err=%v", ok, err)
	}

	ok, err = verifyPassword("wrong horse battery", hash)
	if err != nil || ok {
		t.Fatalf("wrong password: ok=%v err=%v", ok, err)
	}

	_, err = verifyPassword("anything", "$bcrypt$x")
	if !errors.Is(err, errMalformedHash) {
		t.Fatal("a malformed hash must be reported")
	}
}

func TestGenerateToken(t *testing.T) {
	token := generateToken()

	if !isToken(token) || len(token) != len(tokenPrefix)+43 {
		t.Fatalf("token = %q", token)
	}

	if hashSecret(token) == hashSecret(generateToken()) {
		t.Fatal("tokens must differ")
	}

	if len(hashSecret(token)) != 64 {
		t.Fatal("SHA-256 hex must be 64 characters")
	}
}
