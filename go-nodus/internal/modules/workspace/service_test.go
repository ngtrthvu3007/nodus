package workspace

import (
	"errors"
	"strings"
	"testing"
)

func TestValidateWorkspaceName(t *testing.T) {
	cases := []struct {
		name  string
		want  string
		valid bool
	}{
		{"Team", "Team", true},
		{"  Nodus Team  ", "Nodus Team", true},
		{"Dự án", "Dự án", true},
		{strings.Repeat("ă", 100), strings.Repeat("ă", 100), true},
		{"", "", false},
		{"   ", "", false},
		{strings.Repeat("a", 101), "", false},
	}

	for _, testCase := range cases {
		got, err := validateWorkspaceName(testCase.name)

		if testCase.valid && (err != nil || got != testCase.want) {
			t.Fatalf("%q = %q, %v; want %q", testCase.name, got, err, testCase.want)
		}

		if !testCase.valid && !errors.Is(err, errInvalidWorkspaceName) {
			t.Fatalf("%q must be refused with invalid_params", testCase.name)
		}
	}
}
