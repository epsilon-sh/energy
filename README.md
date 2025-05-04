# Epsilon Energy

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Technologies Used](#technologies-used)
4. [Installation](#installation)
5. [Usage](#usage)
6. [Contributing](#contributing)

## Introduction

Epsilon Energy is a web application built using modern web technologies. It offers a range of features designed to enhance user experience and provide seamless performance.

## Features

- **Landing page**: Engaging and informative entry point.
- **WebApp (early access preview)**: Early preview of the core functionalities.
- **API**: (Unavailable for public preview) Backend interactions

## Technologies Used

- **TypeScript**: 5.2.2
- **React**: 18.2.0
- **React Redux**: 9.1.2
- **Vite**: 5.2.0
- **Express**: 4.21.0
- **Three.js**: 0.169.0
- **date-fns**: 4.1.0
- **SQLite**: 1.2.0

## Installation

To get a local copy up and running, follow these simple steps:

### Prerequisites

Ensure you have Node.js 22.9.0 installed (we use nodenv for version management).

```sh
# Check your versions
node -v  # Should be 22.9.0 (or higher)
npm -v

# If using nodenv, it will automatically pick up the correct version from .node-version
nodenv install 22.9.0  # if you don't have this version yet

```
If `npm run dev` errors out with bindings error, make sure to rebuild sqlite manually (requires `node-gyp` and its dependencies installed):

```sh
cd node_modules/sqlite3
npm run rebuild
```


### Clone the repository

```sh
git clone https://github.com/epsilon-sh/energy.git
cd energy
```

### Configure Development Environment

1. Edit `api/dev.env` with your configuration values

2. Prevent git from tracking changes to your local environment file:
```sh
git update-index --assume-unchanged api/dev.env
```

This ensures your secret values won't be committed accidentally.

### Install NPM packages

```sh
npm install
```

### Running the Application

```sh
npm run dev
```

### Building the Application

```sh
npm run build
```

## Usage

After starting the development server, you can access the application in your browser at `http://localhost:3000`.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## About

Epsilon Energy aims to empower today by designing, building, and running the solutions of tomorrow. Our focus is on creating new opportunities and tackling the challenges faced by consumers, producers, and infrastructure in the energy sector. Step into the future of energy with us.

### Features Highlight

- **Actionable insights**: All the information you need at your fingertips.
- **Net positive**: Participate in improving the energy network with our simple solutions.
- **Power in Your Hands**: Take immediate control of your energy consumption and exports.

### Cutting-Edge Solutions

- **Energy monitoring**: Realtime access to insights with consumption transparency, storage planning, and generation patterns.
- **Delivery optimization**: Optimization of energy storage and release, imports and exports management, and energy traceability.

---

By participating in Epsilon Energy, you're joining an initiative to shape the energy landscape of tomorrow. Ready to shape the future?
