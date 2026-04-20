# Requirements Document: Landing, Registration, Forgot Password, and Login Redesign

## Introduction

This document specifies the requirements for four public-facing pages for the MultiMinutes AI application: a Landing/Home page for unauthenticated visitors, a Registration/Signup page for new user account creation, a Forgot Password page for password recovery, and a redesigned Login page. These pages will follow a Japanese corporate design aesthetic inspired by websites showcased on sankoudesign.com (not the sankoudesign.com site itself, but the Japanese corporate websites featured in their gallery), featuring professional, clean, minimalist styling with slide-style sections and smooth animations. All content will be in Vietnamese using React, TypeScript, Tailwind CSS, and Framer Motion.

## Glossary

- **Landing_Page**: The public home page displayed to unauthenticated visitors showcasing the application's value proposition, features, and benefits
- **Registration_Page**: The signup page where new users create accounts by providing email, password, name, and organization information
- **Forgot_Password_Page**: The password recovery page where users can reset their password through email verification
- **Login_Page**: The redesigned login page with links to registration and password recovery pages
- **Auth_System**: The authentication context and API that manages user login, registration, and password reset operations
- **Form_Validator**: The client-side validation system that checks user input before submission
- **UI_Component**: Reusable React components (Button, Input, Modal, Card) used across the application
- **Animation_System**: Framer Motion library used for smooth transitions and animations
- **Design_System**: The Tailwind CSS configuration with custom tokens (primary green #22c55e, rounded-3xl, shadow-modal)
- **Router**: React Router v6 used for navigation between pages
- **Mock_Auth**: The current temporary authentication system that will be replaced with real API calls
- **Japanese_Corporate_Design**: Design aesthetic inspired by Japanese corporate websites featured on sankoudesign.com gallery (not the sankoudesign.com site itself)

## Requirements

### Requirement 1: Landing Page Structure and Content

**User Story:** As a potential customer, I want to see a professional landing page that explains what MultiMinutes AI offers, so that I can understand the product and decide if it's right for my organization.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a hero section with the application name, value proposition, and call-to-action buttons for "Sign Up" and "Login"
2. THE Landing_Page SHALL display a features showcase section highlighting AI transcription, meeting management, and collaboration capabilities
3. THE Landing_Page SHALL display a benefits section explaining advantages for enterprises
4. THE Landing_Page SHALL display a footer with navigation links and company information
5. THE Landing_Page SHALL use slide-style sections with smooth scroll animations powered by the Animation_System
6. THE Landing_Page SHALL include image placeholders for all visual content sections
7. THE Landing_Page SHALL display all content in Vietnamese language
8. THE Landing_Page SHALL be accessible only to unauthenticated users (redirect authenticated users to dashboard)

### Requirement 2: Landing Page Design and Styling

**User Story:** As a visitor, I want a professional, trustworthy landing page with Japanese corporate design aesthetic, so that I feel confident using this enterprise tool.

#### Acceptance Criteria

1. THE Landing_Page SHALL use the Design_System with primary green color (#22c55e), rounded-3xl borders, and shadow-modal effects
2. THE Landing_Page SHALL implement a minimalist, clean layout with ample whitespace following Japanese corporate design principles
3. THE Landing_Page SHALL support dark mode using the existing dark mode classes
4. THE Landing_Page SHALL use Framer Motion animations for section transitions with fade-in and slide-up effects
5. THE Landing_Page SHALL be fully responsive across mobile, tablet, and desktop screen sizes
6. THE Landing_Page SHALL maintain visual consistency with the existing Login page design (same card styling, shadows, typography)
7. WHEN a user scrolls to a section, THE Landing_Page SHALL animate the section into view with smooth transitions

### Requirement 3: Registration Page Form and Validation

**User Story:** As a new user, I want to create an account easily with clear validation feedback, so that I can start using the platform.

#### Acceptance Criteria

1. THE Registration_Page SHALL display input fields for email, password, confirm password, first name, last name, and organization name
2. WHEN a user submits the form, THE Form_Validator SHALL validate that email is in valid format
3. WHEN a user submits the form, THE Form_Validator SHALL validate that password is at least 8 characters long
4. WHEN a user submits the form, THE Form_Validator SHALL validate that password and confirm password fields match
5. WHEN a user submits the form, THE Form_Validator SHALL validate that all required fields are filled
6. WHEN validation fails, THE Registration_Page SHALL display specific error messages for each invalid field
7. THE Registration_Page SHALL display a checkbox for accepting terms of service with a link to terms document
8. WHEN the terms checkbox is unchecked, THE Registration_Page SHALL prevent form submission
9. THE Registration_Page SHALL display a link to the Login page for existing users

### Requirement 4: Registration Page Submission and State Management

**User Story:** As a new user, I want clear feedback during and after registration, so that I know if my account was created successfully.

#### Acceptance Criteria

1. WHEN a user submits valid registration data, THE Auth_System SHALL send a registration request to the backend API
2. WHILE the registration request is processing, THE Registration_Page SHALL display a loading state on the submit button
3. WHILE the registration request is processing, THE Registration_Page SHALL disable all form inputs
4. WHEN registration succeeds, THE Registration_Page SHALL display a success message
5. WHEN registration succeeds, THE Router SHALL navigate the user to the dashboard or login page after 2 seconds
6. WHEN registration fails due to duplicate email, THE Registration_Page SHALL display an error message "Email đã được sử dụng"
7. WHEN registration fails due to server error, THE Registration_Page SHALL display a generic error message "Đăng ký thất bại. Vui lòng thử lại"
8. WHEN registration fails, THE Registration_Page SHALL re-enable form inputs for correction

### Requirement 5: Registration Page Design Consistency

**User Story:** As a new user, I want the registration page to match the application's design language, so that I have a consistent experience.

#### Acceptance Criteria

1. THE Registration_Page SHALL use the same card styling as the Login page (rounded-3xl, shadow-modal, border)
2. THE Registration_Page SHALL use the existing UI_Component library (Button, Input components)
3. THE Registration_Page SHALL use Framer Motion for page entrance animations (fade-in, slide-up)
4. THE Registration_Page SHALL support dark mode using existing dark mode classes
5. THE Registration_Page SHALL display all labels and messages in Vietnamese language
6. THE Registration_Page SHALL be fully responsive across mobile, tablet, and desktop screen sizes
7. THE Registration_Page SHALL use the Design_System typography (text-h1, text-body, text-caption)

### Requirement 6: Forgot Password Page Email Submission

**User Story:** As a user who forgot their password, I want to request a password reset by entering my email, so that I can regain access to my account.

#### Acceptance Criteria

1. THE Forgot_Password_Page SHALL display an email input field with label "Email đăng ký"
2. WHEN a user submits the email, THE Form_Validator SHALL validate that email is in valid format
3. WHEN a user submits a valid email, THE Auth_System SHALL send a password reset request to the backend API
4. WHILE the reset request is processing, THE Forgot_Password_Page SHALL display a loading state on the submit button
5. WHEN the reset request succeeds, THE Forgot_Password_Page SHALL display a success message "Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư"
6. WHEN the reset request fails, THE Forgot_Password_Page SHALL display an error message "Email không tồn tại trong hệ thống"
7. THE Forgot_Password_Page SHALL display a link back to the Login page

### Requirement 7: Forgot Password Page Reset Flow

**User Story:** As a user resetting my password, I want to enter a verification code and new password, so that I can securely change my password.

#### Acceptance Criteria

1. WHEN the email submission succeeds, THE Forgot_Password_Page SHALL display a verification code input field
2. WHEN the email submission succeeds, THE Forgot_Password_Page SHALL display new password and confirm password input fields
3. WHEN a user submits the reset form, THE Form_Validator SHALL validate that verification code is 6 digits
4. WHEN a user submits the reset form, THE Form_Validator SHALL validate that new password is at least 8 characters long
5. WHEN a user submits the reset form, THE Form_Validator SHALL validate that new password and confirm password match
6. WHEN a user submits valid reset data, THE Auth_System SHALL send a password update request with verification code to the backend API
7. WHEN password reset succeeds, THE Forgot_Password_Page SHALL display success message "Mật khẩu đã được đặt lại thành công"
8. WHEN password reset succeeds, THE Router SHALL navigate to the Login page after 2 seconds
9. WHEN password reset fails due to invalid code, THE Forgot_Password_Page SHALL display error message "Mã xác thực không hợp lệ hoặc đã hết hạn"

### Requirement 8: Forgot Password Page Design and User Experience

**User Story:** As a user resetting my password, I want a clear, step-by-step interface, so that I can easily complete the password reset process.

#### Acceptance Criteria

1. THE Forgot_Password_Page SHALL use the same card styling as the Login page (rounded-3xl, shadow-modal, border)
2. THE Forgot_Password_Page SHALL use the existing UI_Component library (Button, Input components)
3. THE Forgot_Password_Page SHALL use Framer Motion for transitions between email submission and password reset steps
4. THE Forgot_Password_Page SHALL display step indicators showing "1. Email" and "2. Đặt lại mật khẩu"
5. THE Forgot_Password_Page SHALL support dark mode using existing dark mode classes
6. THE Forgot_Password_Page SHALL display all content in Vietnamese language
7. THE Forgot_Password_Page SHALL be fully responsive across mobile, tablet, and desktop screen sizes
8. WHEN a user is on step 2, THE Forgot_Password_Page SHALL provide a "Gửi lại mã" button to resend verification code

### Requirement 9: Navigation and Routing Integration

**User Story:** As a user navigating the application, I want seamless transitions between public pages, so that I have a smooth experience.

#### Acceptance Criteria

1. THE Router SHALL define route "/home" or "/" for the Landing_Page accessible to unauthenticated users
2. THE Router SHALL define route "/register" or "/signup" for the Registration_Page
3. THE Router SHALL define route "/forgot-password" for the Forgot_Password_Page
4. WHEN an authenticated user navigates to Landing_Page, THE Router SHALL redirect to "/dashboard"
5. WHEN an authenticated user navigates to Registration_Page, THE Router SHALL redirect to "/dashboard"
6. WHEN an authenticated user navigates to Forgot_Password_Page, THE Router SHALL redirect to "/dashboard"
7. THE Landing_Page call-to-action buttons SHALL navigate to Registration_Page and Login page using the Router
8. THE Registration_Page "Already have an account?" link SHALL navigate to Login page using the Router
9. THE Forgot_Password_Page "Back to Login" link SHALL navigate to Login page using the Router

### Requirement 10: Form Accessibility and User Experience

**User Story:** As a user with accessibility needs, I want all forms to be keyboard-navigable and screen-reader friendly, so that I can use the application effectively.

#### Acceptance Criteria

1. THE Registration_Page form SHALL support keyboard navigation with Tab key between fields
2. THE Forgot_Password_Page form SHALL support keyboard navigation with Tab key between fields
3. THE Registration_Page form SHALL support Enter key submission when focus is on any input field
4. THE Forgot_Password_Page form SHALL support Enter key submission when focus is on any input field
5. THE Form_Validator error messages SHALL be associated with their input fields using aria-describedby attributes
6. THE Registration_Page SHALL use semantic HTML form elements (form, label, input, button)
7. THE Forgot_Password_Page SHALL use semantic HTML form elements (form, label, input, button)
8. WHEN validation errors occur, THE Form_Validator SHALL focus the first invalid input field

### Requirement 11: Landing Page Call-to-Action Effectiveness

**User Story:** As a product manager, I want prominent call-to-action buttons throughout the landing page, so that visitors are encouraged to sign up.

#### Acceptance Criteria

1. THE Landing_Page hero section SHALL display a primary "Bắt đầu miễn phí" button that navigates to Registration_Page
2. THE Landing_Page hero section SHALL display a secondary "Đăng nhập" button that navigates to Login page
3. THE Landing_Page SHALL display a call-to-action section before the footer with "Sẵn sàng bắt đầu?" heading and signup button
4. THE Landing_Page navigation header SHALL display "Đăng nhập" and "Đăng ký" links
5. WHEN a user clicks any signup button, THE Router SHALL navigate to Registration_Page with smooth transition
6. THE Landing_Page buttons SHALL use the Design_System primary green color for signup actions
7. THE Landing_Page buttons SHALL use Framer Motion hover and tap animations for interactive feedback

### Requirement 12: Image Placeholder Management

**User Story:** As a developer, I want clear image placeholders for all visual content, so that designers can easily identify where images should be placed.

#### Acceptance Criteria

1. THE Landing_Page hero section SHALL include an image placeholder with dimensions 600x400px and label "Hero Image"
2. THE Landing_Page features section SHALL include three image placeholders with dimensions 400x300px for each feature
3. THE Landing_Page benefits section SHALL include two image placeholders with dimensions 500x350px
4. THE Landing_Page image placeholders SHALL use a light gray background (#f3f4f6) with centered text label
5. THE Landing_Page image placeholders SHALL use rounded-2xl border radius consistent with Design_System
6. THE Landing_Page image placeholders SHALL be responsive and scale proportionally on mobile devices
7. THE Landing_Page image placeholders SHALL include alt text descriptions for accessibility

### Requirement 13: Login Page Redesign with Navigation Links

**User Story:** As a user on the login page, I want clear links to register or reset my password, so that I can easily access those features when needed.

#### Acceptance Criteria

1. THE Login_Page SHALL be redesigned following Japanese_Corporate_Design aesthetic with minimalist, professional styling
2. THE Login_Page SHALL display a "Chưa có tài khoản?" (Don't have an account?) text with a "Đăng ký ngay" (Sign up now) link that navigates to Registration_Page
3. THE Login_Page SHALL display a "Quên mật khẩu?" (Forgot password?) link below the password field that navigates to Forgot_Password_Page
4. THE Login_Page SHALL use the Design_System with primary green color (#22c55e), rounded-3xl borders, and shadow-modal effects
5. THE Login_Page SHALL maintain the existing authentication functionality with username/password inputs
6. THE Login_Page SHALL use Framer Motion animations for page entrance and interactive elements
7. THE Login_Page SHALL support dark mode using existing dark mode classes
8. THE Login_Page SHALL be fully responsive across mobile, tablet, and desktop screen sizes
9. WHEN a user clicks "Đăng ký ngay" link, THE Router SHALL navigate to Registration_Page with smooth transition
10. WHEN a user clicks "Quên mật khẩu?" link, THE Router SHALL navigate to Forgot_Password_Page with smooth transition

### Requirement 14: Login Page Visual Hierarchy and Layout

**User Story:** As a user visiting the login page, I want a clean, professional interface that clearly guides me through the login process, so that I can access my account efficiently.

#### Acceptance Criteria

1. THE Login_Page SHALL display the application logo and name prominently at the top of the card
2. THE Login_Page SHALL use ample whitespace between form elements following Japanese_Corporate_Design principles
3. THE Login_Page SHALL display form elements in a logical vertical flow: logo → title → username → password → forgot password link → submit button → signup link
4. THE Login_Page SHALL use subtle hover effects on interactive elements (links, buttons) for better user feedback
5. THE Login_Page SHALL display the "Quên mật khẩu?" link in a subtle color (text-gray-600) aligned to the right of the password field
6. THE Login_Page SHALL display the "Chưa có tài khoản?" section at the bottom of the card with centered alignment
7. THE Login_Page SHALL use consistent typography from Design_System (text-h1 for title, text-body for labels, text-caption for links)
8. THE Login_Page SHALL remove or minimize the demo account information box to maintain clean aesthetic (or move to a collapsible section)
