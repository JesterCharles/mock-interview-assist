# Compute Engine Deployment Guide

This guide explains how to deploy the Interview Assessment App to a Google Compute Engine (GCE) Virtual Machine, and how to configure a Google Cloud External HTTP(S) Load Balancer to secure the application with HTTPS.

## Why Compute Engine?
Unlike Cloud Run (which is stateless), a Compute Engine VM provides a persistent file system. This allows the application to save interview histories and read local markdown files from the training curriculum without requiring any code modifications or external buckets like Cloud Storage.

---

## Prerequisites
1. A Google Cloud Project with billing enabled.
2. The Compute Engine API enabled.
3. Your code hosted in a Git repository (e.g., GitHub, GitLab).
4. (For HTTPS) A registered domain name where you can manage DNS records.

---

## Phase 1: Deployment Steps

### 1. Create a Compute Engine Instance
1. Go to the **Compute Engine -> VM instances** page in the Google Cloud Console.
2. Click **Create Instance**.
3. **Name**: `interview-app-vm` (or similar).
4. **Region/Zone**: Choose one close to you.
5. **Machine Configuration**: `e2-micro` or `e2-small` is sufficient for this application.
6. **Boot Disk**: The default Debian image is fine. Change the size to **20GB** or more to ensure you have room for Docker images and data.
7. **Firewall**: Check **Allow HTTP traffic** (we will configure the app to run on port 80).

### 2. Configure the Startup Script (Optional but Recommended)
You can automate the setup by pasting the contents of `deploy-gce.sh` into the VM's Startup Script.

1. Scroll down to **Advanced options > Management**.
2. Under **Automation**, locate the **Startup script** box.
3. Paste the contents of `deploy-gce.sh`. *(Be sure to update the REPO_URL variable in the script with your actual Git repository URL!)*
4. Click **Create**.

### 3. Manual Setup (If you didn't use the startup script)
If you prefer to set it up manually:

1. SSH into your newly created VM by clicking the **SSH** button in the Cloud Console.
2. Install Docker via:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git
```
3. Clone your repository:
```bash
git clone <your-repo-url> /opt/interview-app
```
4. Navigate to the application directory:
```bash
cd /opt/interview-app/training/interview-assessment-app
```

### 4. Provide API Keys
Create your `.env.docker` file. This prevents your secrets from being committed to version control.
```bash
nano .env.docker
```
Add your keys:
```env
OPENAI_API_KEY=your_actual_key_here
GITHUB_TOKEN=your_github_token_here
```
Save and exit (Ctrl+O, Enter, Ctrl+X).

### 5. Start the Application
Run the application using Docker Compose:

```bash
sudo docker compose up -d --build
```

**Testing the Application**:
Find the External IP address of your VM on the Compute Engine instances page. The application currently runs on port 80. You can access it via `http://YOUR_EXTERNAL_IP`.

---

## Phase 2: Setting up HTTPS via Google Cloud Load Balancer

To serve your application securely over HTTPS (with auto-renewing SSL certificates), you must place a Google Cloud Application Load Balancer in front of your VM instead of exposing the VM directly.

### 1. Reserve a Global Static IP Address
1. Navigate to **VPC network > IP addresses**.
2. Click **Reserve External Static Address**.
3. **Name**: `interview-app-ip`
4. **Network Service Tier**: Premium.
5. **Type**: Global.
6. Click **Reserve**. Copy this newly reserved IP address, as you will need it for your DNS records.

### 2. Update your DNS Records (Cloudflare Example)
If you are managing your domain via Cloudflare, follow these exact steps to ensure Google's Managed SSL certificate can provision correctly:
1. Log into your Cloudflare dashboard and select your domain (e.g., `nextlevelmock.com`).
2. Navigate to **DNS > Records** on the left sidebar.
3. Click **Add record**.
4. **Type**: `A`
5. **Name**: `@` (for the root domain like `nextlevelmock.com`) or `www` (for `www.nextlevelmock.com`).
6. **IPv4 address**: Paste the **Global Static IP address** you reserved in Step 1.
7. **Proxy status**: **CRITICAL** - Toggle this setting so that the cloud icon turns **Grey (DNS Only)**. If left orange (Proxied), Cloudflare will mask the Google Cloud IP and the Google Managed SSL Certificate provision process will fail!
8. Click **Save**.

### 3. Create an Unmanaged Instance Group
Load balancers can only route traffic to "Instance Groups" as backend services.
1. Navigate to **Compute Engine > Instance groups**.
2. Click **Create Instance Group**.
3. Choose **New unmanaged instance group**.
4. **Name**: `interview-app-ig`
5. **Region/Zone**: Match the zone where your `interview-app-vm` resides.
6. **Network/Subnetwork**: Default.
7. **VM instances**: Select your `interview-app-vm` from the dropdown.
8. Click **Create**.

### 4. Create the Load Balancer
1. Navigate to **Network services > Load balancing**.
2. Click **Create Load Balancer**.
3. Choose **Application Load Balancer (HTTP/HTTPS)** and click Next.
4. Choose **Public facing (external)** and **Global load balancer** (classic or modern is fine).
5. **Name**: `interview-app-lb`

**Backend Configuration**:
1. Click Backend configuration > **Create a Backend Service**.
2. **Name**: `interview-app-backend`
3. **Backend type**: Instance group.
4. **Protocol**: HTTP
5. **Named port**: `http` (Port 80).
6. Under **Backends**, select your `interview-app-ig` instance group.
7. **Health Check**: Create a new health check.
   - Name: `interview-app-healthcheck`
   - Protocol: HTTP
   - Port: 80
   - Request path: `/`
8. Click **Save and Continue** / **Create** to finish the backend service.

**Frontend Configuration (HTTPS)**:
1. Click **Frontend configuration**.
2. **Protocol**: HTTPS (includes HTTP/2)
3. **IP address**: Select the Global Static IP you reserved (`interview-app-ip`).
4. **Certificate**: Click the dropdown and select **Create a new certificate**.
   - Name: `interview-app-cert`
   - Create mode: **Create Google-managed certificate**.
   - Domains: Enter your domain (`interview.yourdomain.com`).
   - Click Create.

*(Optional) HTTP to HTTPS Redirect*:
Add a second Frontend configuration. Protocol: HTTP, IP address: your reserved IP. Check the box to "Enable HTTP to HTTPS redirect".

### 5. Review and Finalize
1. Click **Review and finalize**, ensure the frontend shows HTTPS and the backend points to your instance group.
2. Click **Create**.

### 6. Wait for SSL Provisioning
Google-managed SSL certificates require your DNS A-Record to be properly pointing to the Load Balancer IP before they activate. Once you create the Load Balancer, it usually takes **15 to 60 minutes** for the SSL certificate status to change from `PROVISIONING` to `ACTIVE`. 

Once Active, you can navigate securely to `https://interview.yourdomain.com`!

---

## Updating the Application
When you make changes to your curriculum or code, SSH into the VM and run:

```bash
cd /opt/interview-app/training/interview-assessment-app
git pull
sudo docker compose up -d --build
```
This pulls the latest changes and seamlessly rebuilds the application container behind the active Load Balancer.
