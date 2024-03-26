import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from 'path'
import { defineConfig } from 'vite'

// export default {

//   plugins: [
//     basicSsl()
//   ]
// }




export default defineConfig({
  build: { rollupOptions: {
      input: { 
        main: resolve(__dirname, 'index.html'),
        conditionA: resolve(__dirname, 'conditionA.html'),
        conditionB: resolve(__dirname, 'conditionB.html'),
        conditionC: resolve(__dirname, 'conditionC.html'),
        conditionD: resolve(__dirname, 'conditionD.html'),
        conditionE: resolve(__dirname, 'conditionE.html'),
        conditionF: resolve(__dirname, 'conditionF.html'),
        conditionG: resolve(__dirname, 'conditionH.html'),
        conditionH: resolve(__dirname, 'conditionH.html'),
      },
    },
  },

  plugins: [
    basicSsl()
  ]
})