# Manual setup

### Install Docker

To run a pub you need to have a static public IP, ideally with a DNS record (i.e.`<hostname.yourdomain.tld>`).

On a fresh Debian 9 box, as root, run:

```shell
apt update
apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common
wget https://download.docker.com/linux/debian/gpg -O docker-gpg
sudo apt-key add docker-gpg
echo "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee -a /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce
systemctl start docker
systemctl enable docker
```

### Install the `ssb-mirror` image

#### (Option A) Pull the image from docker hub

```shell
docker pull staltz/ssb-mirror
```

#### (Option B) Build the image from source

From GitHub:

```shell
git clone https://github.com/staltz/ssb-mirror.git
cd ssb-mirror
docker build -t staltz/ssb-mirror .
```

### Create a container called `sbot`

#### Step 1. Create a directory on the Docker host for persisting the mirror's data

```shell
mkdir ~/ssb-mirror-data
chown -R 1000:1000 ~/ssb-mirror-data
```

(If migrating from an old server, copy the previous `ssb-mirror-data` and paste it in the new one)

#### Step 2. Configure the firewall to redirect the HTTP port

```shell
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8007
```

#### Step 3. Run the container

Create a `./create-sbot` script:

```shell
cat > ./create-sbot <<EOF
#!/bin/bash
memory_limit=$(($(free -b --si | awk '/Mem\:/ { print $2 }') - 200*(10**6)))
docker run -d --name sbot \
   -v ~/ssb-mirror-data/:/home/node/.ssb/ \
   --network host \
   --restart unless-stopped \
   --memory "\$memory_limit" \
   staltz/ssb-mirror
EOF
```

where `--memory` sets an upper memory limit of your total memory minus 200 MB (for example: on a 1 GB server this could be simplified to `--memory 800m`).

Then make the script executable and run it:

```shell
chmod +x ./create-sbot
./create-sbot
```

#### Step 4. Create the `./sbot` script

The shell script in `./sbot` will help us command our Scuttlebutt mirror server:

```shell
cat > ./sbot <<EOF
#!/bin/sh
docker exec -it sbot ssb-mirror \$@
EOF
```

Then make it executable and run it:

```shell
chmod +x ./sbot
./sbot check
```

### Setup an auto-healer container

SSB mirror has a built-in health check: `ssb-mirror check`.

When `sbot` becomes unhealthy (it will!), we want to kill the container, so it will be automatically restarted by Docker.

For this situation, we will use [ahdinosaur/healer](https://github.com/ahdinosaur/healer):

```shell
docker pull ahdinosaur/healer
```

```shell
docker run -d --name healer \
  -v /var/run/docker.sock:/tmp/docker.sock \
  --restart unless-stopped \
  ahdinosaur/healer
```

### Ensure containers are always running

Sometimes the `sbot` or `healer` containers will stop running (despite `--restart unless-stopped`!).

For this situation, we will setup two cron job scripts:

```shell
printf '#!/bin/sh\n\ndocker start sbot\n' | tee /etc/cron.hourly/sbot && chmod +x /etc/cron.hourly/sbot
printf '#!/bin/sh\n\ndocker start healer\n' | tee /etc/cron.hourly/healer && chmod +x /etc/cron.hourly/healer
```

Because `docker start <service>` is [idempotent](https://en.wikipedia.org/wiki/Idempotent), it will not change anything if the service is already running, but if the service is not running it will start it.
