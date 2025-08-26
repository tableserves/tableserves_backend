import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default (ctx) => ({
  plugins: [
    tailwindcss(),
    autoprefixer(),
  ],
})
