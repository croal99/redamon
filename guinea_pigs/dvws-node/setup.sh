#!/bin/bash
# Install Docker and deploy DVWS-Node (Damn Vulnerable Web Services)
# Exposes: port 80 (REST/SOAP), port 4000 (GraphQL), port 9090 (XML-RPC)
set -e

echo "=== Installing Docker ==="

# Detect OS and install Docker
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
fi

if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose git
elif [ "$OS" = "amzn" ] || [ "$OS" = "fedora" ] || [ "$OS" = "rhel" ]; then
    sudo dnf install -y docker git
    sudo curl -sL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

sudo systemctl start docker
sudo systemctl enable docker

echo "=== Cleaning up Docker space ==="
cd ~
if [ -d dvws-node ]; then
    cd dvws-node
    sudo docker-compose down --volumes --remove-orphans 2>/dev/null || true
    cd ~
fi
# Stop and remove any other running containers (previous guinea pigs, etc.)
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true
sudo docker system prune -a -f --volumes

echo "=== Cloning DVWS-Node ==="
rm -rf ~/dvws-node
git clone https://github.com/snoopysecurity/dvws-node.git ~/dvws-node
cd ~/dvws-node

echo "=== Building and starting containers ==="
sudo docker-compose up -d --build

PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo '<IP>')

echo ""
echo "=== DONE ==="
echo ""
echo "DVWS-Node is running:"
echo "  REST API + Swagger:  http://${PUBLIC_IP}/"
echo "  Swagger UI:          http://${PUBLIC_IP}/api-docs"
echo "  GraphQL Playground:  http://${PUBLIC_IP}:4000/"
echo "  XML-RPC:             http://${PUBLIC_IP}:9090/xmlrpc"
echo "  SOAP WSDL:           http://${PUBLIC_IP}/dvwsuserservice?wsdl"
echo ""
echo "Default credentials:"
echo "  admin / letmein  (admin user)"
echo "  test  / test     (regular user)"
echo ""
echo "Health check: curl http://${PUBLIC_IP}/api/v2/info"
