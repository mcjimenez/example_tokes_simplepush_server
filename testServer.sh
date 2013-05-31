#!/bin/sh

#FORMAT='URL: %{url_effective}. RC: %{response_code}\n'

for i in `cat - `
do
    COMMAND=`echo $i | cut -f 1 -d@`
    DATA=`echo $i | cut -f 2 -d@`
    URL=`echo $i | cut -f 3 -d@`
    echo "++ $COMMAND $URL [$DATA]"
    curl -w "\n\n" -X $COMMAND -d "$DATA" "$URL"
done <<EOF
GET@@http://localhost:8123/about
GET@@http://localhost:8123/friend/GuyOne
GET@endpoint=http://a.end.com/url@http://localhost:8123/friend/GuyOne
PUT@endpoint=http://a.end.com/url@http://localhost:8123/friend/GuyOne
PUT@endpoint=http://a.end.com/url@http://localhost:8123/friend/GuyOne/GuyTwo
GET@@http://localhost:8123/friend/GuyOne
PUT@endpoint=http://a.end.com/urlB@http://localhost:8123/friend/GuyOne/GuyTwo
GET@@http://localhost:8123/friend/GuyOne
PUT@endpoint=http://a.end.com/urlCAMBIO@http://localhost:8123/friend/GuyOne/GuyThree
PUT@endpoint=http://a.end.com/urlD@http://localhost:8123/friend/GuyOne/GuyTwo
PUT@endpoint=http://a.end.com/urlF@http://localhost:8123/friend/GuyOne/GuyFive
PUT@endpoint=http://a.end.com/urlG@http://localhost:8123/friend/GuyOne/GuyFour
PUT@endpoint=http://a.end.com/urlH@http://localhost:8123/friend/GuyThree/GuyFour
GET@@http://localhost:8123/friend/GuyOne
GET@@http://localhost:8123/friend/GuyThree
GET@@http://localhost:8123/friend/GuyFive
GET@@http://localhost:8123/friend/GuyOne
PUT@endpoint=http://a.end.com/urlI@http://localhost:8123/friend/GuyThree/GuyFour
GET@@http://localhost:8123/friend/GuyThree
PUT@endpoint=http://a.end.com/urlJ@http://localhost:8123/friend/GuyThree/GuyFour
GET@@http://localhost:8123/friend/GuyThree
DELETE@@http://localhost:8123/friend/GuyOne/GuyTwo
GET@@http://localhost:8123/friend/GuyOne
DELETE@@http://localhost:8123/friend/GuyOne/GuyTwo
GET@@http://localhost:8123/friend/GuyOne
DELETE@@http://localhost:8123/friend/GuyOne/GuyFour
GET@@http://localhost:8123/friend/GuyOne
EOF
