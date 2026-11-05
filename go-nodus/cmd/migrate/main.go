// Command migrate applies the SQL migrations in ./migrations with golang-migrate, pinned in go.mod
// so every machine runs the same version without installing a CLI. Use it through the Makefile targets.
package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

const migrationsDir = "migrations"

const usage = `usage: go run ./cmd/migrate <command>
  up              apply all pending migrations
  down [n]        roll back n migrations (default 1)
  version         print the current version
  force <v>       set the version without running SQL (e.g. a database migrated by hand)
  create <name>   create the next numbered up/down pair, e.g. create add_note_position`

var namePattern = regexp.MustCompile(`^[a-z0-9_]+$`)

func main() {
	if len(os.Args) < 2 {
		log.Fatal(usage)
	}

	command, args := os.Args[1], os.Args[2:]
	if command == "create" {
		createMigration(argAt(args, 0, "name"))
		return
	}

	if err := run(command, args); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatal(err)
	}
}

func run(command string, args []string) error {
	m, err := newMigrate()
	if err != nil {
		return err
	}
	defer m.Close()

	switch command {
	case "up":
		return m.Up()
	case "down":
		steps := 1
		if len(args) > 0 {
			steps = mustAtoi(args[0])
		}
		return m.Steps(-steps)
	case "force":
		return m.Force(mustAtoi(argAt(args, 0, "version")))
	case "version":
		return printVersion(m)
	default:
		return errors.New(usage)
	}
}

func newMigrate() (*migrate.Migrate, error) {
	// .env is optional: DATABASE_URL may also come from the environment (CI, containers).
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, errors.New("DATABASE_URL is not set")
	}

	return migrate.New("file://"+migrationsDir, toPgx5URL(dbURL))
}

// The pgx/v5 driver registers the pgx5:// scheme; the app uses postgres:// URLs.
func toPgx5URL(dbURL string) string {
	for _, prefix := range []string{"postgres://", "postgresql://"} {
		if strings.HasPrefix(dbURL, prefix) {
			return "pgx5://" + strings.TrimPrefix(dbURL, prefix)
		}
	}
	return dbURL
}

func printVersion(m *migrate.Migrate) error {
	version, dirty, err := m.Version()
	if errors.Is(err, migrate.ErrNilVersion) {
		fmt.Println("no migration applied")
		return nil
	}
	if err != nil {
		return err
	}

	fmt.Printf("version %d (dirty: %t)\n", version, dirty)
	return nil
}

// createMigration writes empty NNN_<name>.up.sql / .down.sql files, numbered after the highest existing one.
func createMigration(name string) {
	if !namePattern.MatchString(name) {
		log.Fatalf("invalid name %q: use lowercase letters, digits and underscores", name)
	}

	base := filepath.Join(migrationsDir, fmt.Sprintf("%03d_%s", nextVersion(), name))
	for _, suffix := range []string{".up.sql", ".down.sql"} {
		if err := os.WriteFile(base+suffix, nil, 0o644); err != nil {
			log.Fatal(err)
		}
	}

	fmt.Printf("created %s.up.sql and %s.down.sql\n", base, base)
}

func nextVersion() int {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		log.Fatal(err)
	}

	next := 1
	for _, entry := range entries {
		prefix, _, ok := strings.Cut(entry.Name(), "_")
		if !ok {
			continue
		}
		if version, err := strconv.Atoi(prefix); err == nil && version >= next {
			next = version + 1
		}
	}
	return next
}

func argAt(args []string, index int, name string) string {
	if len(args) <= index {
		log.Fatalf("missing %s\n%s", name, usage)
	}
	return args[index]
}

func mustAtoi(value string) int {
	number, err := strconv.Atoi(value)
	if err != nil {
		log.Fatalf("%q is not a number", value)
	}
	return number
}
