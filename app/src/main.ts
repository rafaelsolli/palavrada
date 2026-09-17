import './estilos/tokens.css';
import './estilos/botoes.css';
import { mount } from 'svelte';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
