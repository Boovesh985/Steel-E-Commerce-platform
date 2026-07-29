import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-bg">
      <div className="text-center max-w-md">
        <p className="text-headline-xl text-primary font-mono mb-2">404</p>
        <h1 className="text-headline-lg text-text mb-3">Page not found</h1>
        <p className="text-body-md text-text-secondary mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button leftIcon={<Home className="w-4 h-4" />}>Go home</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline" leftIcon={<Search className="w-4 h-4" />}>Browse products</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
