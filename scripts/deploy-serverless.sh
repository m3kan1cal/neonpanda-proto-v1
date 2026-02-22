#!/bin/zsh

export AWS_REGION="us-west-2"
npx dotenvx run --env-file=.env.local -- ampx sandbox --profile midgard-sandbox
