import { createRouter, createWebHistory } from "vue-router";  // createRouter和createWebHistory是用於創建路由實例和設置路由歷史模式
import Login from "../views/UserLogin.vue";  // 登錄頁面組件，當路由指向/login時會顯示這個組件
import Main from "../views/MainPage.vue";

// 定義路由配置，這是路由表，包含了每個路徑對應的組件
const routes = [
    {
        path: "/login",  // 路徑為/login，會顯示Login組件
        name: "Login",  // 為這個路由定義一個名稱，通常用來在導航或其他地方引用這個路由
        component: Login  // 當匹配到這個路徑時，顯示Login組件
    },
    {
        path: "/main",
        name: "Main",
        component: Main
    }
];

// 創建Vue Router實例
const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),  // 設定路由歷史模式，使用的是HTML5 History API，可以實現更乾淨的URL(不帶#符號)
    routes  // 註冊路由配置，為上述定義的routes
});

// 將創建好的路由實例匯出，供其它地方使用
export default router;