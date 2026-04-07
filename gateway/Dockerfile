FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal

RUN go build -o /revornix-gateway ./cmd/gateway

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /revornix-gateway /usr/local/bin/revornix-gateway

EXPOSE 8787

CMD ["revornix-gateway"]
