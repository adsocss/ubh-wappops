#!/bin/bash
# Script to create locally trusted certificates using mkcert

echo "🔧 Setting up locally trusted certificates for WAPPOPS development..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert not found. Installing mkcert..."
    
    # Install mkcert based on the OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # For Ubuntu/Debian
        if command -v apt &> /dev/null; then
            echo "📦 Installing mkcert via apt..."
            sudo apt update
            sudo apt install -y mkcert
        # For other Linux distros, try downloading directly
        else
            echo "📦 Downloading mkcert binary..."
            curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
            chmod +x mkcert-v*-linux-amd64
            sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "📦 Installing mkcert via Homebrew..."
            brew install mkcert
        else
            echo "❌ Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install mkcert manually: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
fi

echo "✅ mkcert is available"

# Install the local CA
echo "🔒 Installing local CA..."
mkcert -install

# Create certificate directory
mkdir -p ../ztest/cert-trusted

# Generate certificates for your development domains
echo "🔐 Generating certificates..."

# Add your domains here - replace with your actual development domains
DOMAINS="localhost wappops.local wappops-dev.local 127.0.0.1 ::1"

echo "📋 Creating certificates for: $DOMAINS"

cd ../ztest/cert-trusted
mkcert $DOMAINS

# Rename the generated files to match your current setup
mv localhost+*-key.pem private.key
mv localhost+*.pem certificate.crt

echo "✅ Certificates created in ../ztest/cert-trusted/"
echo "📄 Private key: private.key"
echo "📄 Certificate: certificate.crt"

echo ""
echo "🔧 Next steps:"
echo "1. Update your Vite config to use the new certificates"
echo "2. Access your app via https://localhost:5173"
echo "3. The certificate will be automatically trusted by your browser"
echo ""
echo "💡 You can also add entries to /etc/hosts for custom domains:"
echo "   127.0.0.1 wappops.local"
echo "   127.0.0.1 wappops-dev.local"
