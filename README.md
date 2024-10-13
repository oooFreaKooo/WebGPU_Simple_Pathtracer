```markdown
# A Simple WebGPU Pathtracer

Welcome to the repository of my WebGPU Pathtracer project! This project is a straightforward implementation of a pathtracer using WebGPU and TypeScript. It's designed to be a starting point for those interested in exploring the capabilities of WebGPU in rendering and graphics programming.

![projektbild](https://github.com/user-attachments/assets/cba4d817-094c-4a78-8b2d-f365d7bd4f54)
![dragon1](https://github.com/oooFreaKooo/WebGPU_Simple_Pathtracer/assets/60832668/7f8c6265-2c88-486d-8ad9-17761430a193)
![sphereflake2](https://github.com/oooFreaKooo/WebGPU_Simple_Pathtracer/assets/60832668/92c27dca-96e5-4ff2-a43c-effc1ed5baa6)
![manyobjects](https://github.com/oooFreaKooo/WebGPU_Simple_Pathtracer/assets/60832668/21047ea3-939c-4cda-8802-b2e59d3dee6d)
![caustic1](https://github.com/oooFreaKooo/WebGPU_Simple_Pathtracer/assets/60832668/3dd66f00-3575-4703-a26b-b76a4af91ded)

## Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed:

- The latest version of [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) (managed via [Corepack](https://nodejs.org/dist/latest/docs/api/corepack.html))

Yarn is used as the package manager for this project, so ensure you enable Corepack to manage it correctly.

### Installation

To get started with this project, follow these simple steps:

1. **Clone the Repository**

   Clone this repository to your local machine using the following command:

   ```bash
   git clone https://github.com/oooFreaKooo/WebGPU_Simple_Pathtracer.git
   ```

2. **Enable Corepack**

   To manage Yarn properly with the correct version, you need to enable Corepack if it isn't enabled already. Run the following command:

   ```bash
   corepack enable
   ```

   Then, ensure you are using the latest version of Yarn (e.g., 4.5.0) by running:

   ```bash
   corepack prepare yarn@4.5.0 --activate
   ```

3. **Install Dependencies**

   Navigate to the project directory and run the following command to install the necessary dependencies:

   ```bash
   yarn
   ```

4. **Start the Project**

   Once the dependencies are installed, you can start the project by running:

   ```bash
   yarn build
   yarn dev
   ```

   This will launch the pathtracer on a local development server (typically available at `http://localhost:3000/`). If you want to automatically open the browser, Vite has already been configured to do so.

### Optional: Share Your Local Project

If you want to share your local project with others over the internet, you can use tools like `ngrok` to create a secure tunnel to your local server. To do so, run the following command:

```bash
ngrok http 5173
```

Replace `5173` with the port number your project is running on. This will provide a public URL that you can share with others.

## Usage

Feel free to explore and modify the code to learn more about WebGPU and path tracing. This project is a great starting point for anyone looking to delve into advanced graphics programming with modern web technologies.

## License

This project is open-source and available to anyone. You are free to use, modify, and distribute the code in your own projects, whether personal, educational, or commercial. No attribution is required, but always appreciated!

## Framework Overview
![core_diagram2](https://github.com/oooFreaKooo/WebGPU_Simple_Pathtracer/assets/60832668/c56b46b3-366a-4dee-8c80-2b72880a8517)
![img2](https://github.com/user-attachments/assets/19779169-7231-4af8-83c4-5091cb28909d)

```