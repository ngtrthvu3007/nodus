.PHONY: sqlc-generate migrate-apply

sqlc-generate:
	docker run --rm -v "$(CURDIR):/src" -w /src sqlc/sqlc generate

migrate-apply:
	docker compose exec -T postgres psql -U nodus_admin_user -d nodus_local -f - < migrations/$(FILE)
