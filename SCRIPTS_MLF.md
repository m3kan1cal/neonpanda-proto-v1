# Deploy to sandbox

export AWS_REGION="us-west-2"
npx dotenvx run --env-file=.env.local -- ampx sandbox --profile midgard-sandbox

# Collect logs for Stream Coach Conversation

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-d2y0pmelq37lyh-ma-streamcoachconversationl-pklbNzFoVFVu' \
 --streams='2026/04/17/[$LATEST]cba89fc3b6dd4a728806d6ab10e52dd1,2026/04/16/[$LATEST]fb1d353fd4d44e7e97afc2654466fd47,2026/04/16/[$LATEST]b5fe2a26070e46e08fbdd583add76f46' \
 --output=./test/fixtures/test-streamconvo-20260416/streamconvo-logs.csv \
 --verbose

export AWS_PROFILE="midgard-sandbox"
export AWS_REGION="us-west-2"
node scripts/fetch-incident-logs.js \
 --log-group='/aws/lambda/amplify-d2y0pmelq37lyh-de-buildconversationsummary-yKiMllSNbWrs' \
 --streams='2026/04/15/[$LATEST]6075c4519e53460a8ca8e17067c07d27' \
 --note='I am seeing WARN normalizeSchemaArrayFields: wrapped non-array value in array for fields and want to understand if they truly should be warned and if there is anything else we can do to make this more robust.' \
 --run-agent \
 --model=opus

# Collect logs for Stream Coach Creator Session

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-neonpandaprotov1--streamcoachcreatorsessio-AhT0x3Jp7Nto' \
 --streams='2026/03/05/[$LATEST]5efa43b18f79493998011e51996877f7' \
 --output=./test/fixtures/test-streamcoachcreatorsessio-20260304/streamcoachcreatorsessio-logs.csv \
 --verbose`

# Collect logs for Stream Program Designer Session

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-neonpandaprotov1--streamprogramdesignlambd-EeDUKYWMcyVP' \
 --streams='2026/03/07/[$LATEST]7563499dbc7a4eaf8c873a59431a7605' \
 --output=./test/fixtures/test-programs-20260305/streamprogramdesigner-logs.csv \
 --verbose

# Collect logs for Build Workout

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-neonpandaprotov1--buildworkoutlambda23D1E4-EyMhp5RrlgG2' \
 --streams='2026/03/21/[$LATEST]b5cecb2c0c454ed4b6fa33e5cada645b' \
 --output=./test/fixtures/test-logworkout-20260320/buildworkout-logs.csv \
 --verbose

# Collect logs for Build Exercise

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-neonpandaprotov1--buildexerciselambda3F48A-zAGe52zmb2a2' \
 --streams='2026/02/24/[$LATEST]5e2d23c77a764d859ae8f5e26f951640' \
 --output=./test/fixtures/test-workouts-20260223/buildexercise-logs.csv \
 --verbose

# Collect logs for Build Weekly Analytics

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-d2y0pmelq37lyh-de-buildweeklyanalyticslamb-Qg0jKMMwY3Tp' \
 --streams='2026/03/08/[$LATEST]87ebd129df154fe18602526474d86cd5' \
 --output=./test/fixtures/test-buildweeklyanalytics-20260310/buildweeklyanalytics-logs.csv \
 --verbose

# Collect logs for Build Program

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-d2y0pmelq37lyh-ma-buildprogramlambda205E00-ep5i7Hp9pHh8' \
 --streams='2026/03/16/[$LATEST]c874a77ed4644b9b957820e641f47f25' \
 --output=./test/fixtures/test-programs-20260315/buildprogram-logs.csv \
 --verbose

# Collect logs for Build Weekly Analytics

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-d2y0pmelq37lyh-ma-buildweeklyanalyticslamb-FYO1slu2wv8h' \
 --streams='2026/03/15/[$LATEST]f3ba7dddc1504df88643052fc42feb22' \
 --output=./test/fixtures/test-analytics-20260315/buildweeklyanalytics-logs.csv \
 --verbose

# Collect logs for Build Conversation Summary

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-d2y0pmelq37lyh-de-buildconversationsummary-PMZAZh02cPkn' \
 --streams='2026/03/02/[$LATEST]1096c02c547844f2a510c0704f163531' \
 --output=./test/fixtures/test-convosummary-20260302/buildconversationsummary-logs.csv \
 --verbose

# Collect logs for Log Workout Template

export AWS_REGION="us-west-2"
export AWS_PROFILE="midgard-sandbox"
node scripts/fetch-log-streams.js \
 --log-group='/aws/lambda/amplify-neonpandaprotov1--logworkouttemplatelambda-VJMjxKluaRJF' \
 --streams='2026/03/21/[$LATEST]7ec7a553485a4ccba6abac83f8116d83' \
 --output=./test/fixtures/test-logworkout-20260320/logworkouttemplate-logs.csv \
 --verbose

Issues:

- Delete exercises after workout has been deleted
-
