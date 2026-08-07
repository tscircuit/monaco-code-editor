import { GlobalRegistrator } from "@happy-dom/global-registrator"

// Hook tests render into a real DOM; pure-logic tests are unaffected.
GlobalRegistrator.register()
