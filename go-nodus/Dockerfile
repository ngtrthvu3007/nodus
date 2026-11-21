# Builds the API image for `docker compose --profile app up --build` (see docker-compose.yml).
FROM golang:1.26-alpine AS build
WORKDIR /src

# Dependencies first, so this layer is reused while only the code changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /out/api ./cmd/api

FROM alpine:3.22
RUN adduser -D -u 10001 nodus
USER nodus
COPY --from=build /out/api /usr/local/bin/api

EXPOSE 8080
ENTRYPOINT ["api"]
