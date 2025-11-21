import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Advertise from "@/pages/Advertise";
import Contact from "@/pages/Contact";
import Success from "@/pages/Success";
import Integration from "@/pages/Integration";
import Widget from "@/pages/Widget";
import Admin from "@/pages/Admin";
import TestUpload from "@/pages/TestUpload";
import StateLanding from "@/pages/StateLanding";
import DisposalSiteLanding from "@/pages/DisposalSiteLanding";
import NotFound from "@/pages/not-found";
import { Redirect } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/widget">
        <Widget />
      </Route>
      <Route>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/advertise" component={Advertise} />
              <Route path="/contact" component={Contact} />
              <Route path="/success" component={Success} />
              <Route path="/integration" component={Integration} />
              <Route path="/admin" component={Admin} />
              <Route path="/test-upload" component={TestUpload} />
              <Route path="/indiana">
                <Redirect to="/state/IN" />
              </Route>
              <Route path="/state/:stateCode" component={StateLanding} />
              <Route path="/disposal-sites/:stateCode" component={DisposalSiteLanding} />
              <Route component={NotFound} />
            </Switch>
          </main>
          <Footer />
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
